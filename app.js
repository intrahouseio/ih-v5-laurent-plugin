/**
 * app.js
 * TCP клиент для контроллеров Laurent-2
 */

const util = require('util');
const net = require('net');
const qr = require("querystring");

const protocol = require('./lib/protocol');

module.exports = async function(plugin) {
  const waiting = [];
  const tosend = protocol.getStartMessages(plugin.jerome, plugin.params.data);

  const {host, port} = plugin.params.data;

  let switching = {};
  let client = '';
  connect();

  function connect() {
    client = net.createConnection({ host, port }, () => {
      plugin.log(getHostPortStr() + ' connected', 'connect');

      setInterval(() => {
        let res = checkResponse();
        if (res) {
          stop();
          plugin.exit(2, res);
        }
      }, 1000); // Проверка потери связи

      sendNext();
    });

    // Этот таймаут контролирует только прием данных, keepalive не учитывает
    client.setTimeout(30000, () => {
      tosend.push(protocol.getInfMessage());
      sendNext();
    });

    client.on('end', () => {
      plugin.exit(1, 'disconnected');
    });

    client.on('error', e => {
      client.end();
      plugin.exit(1, 'Connection error:  ' + getHostPortStr() + ' ' + e.code);
    });

    client.on('data', data => {
      processInputData(data.toString());
      switching = {};
    });
  }

  function processInputData(str) {
    plugin.log('=> ' + str, 2);

    let result = '';
    let arrstr = str.split(/\r\n/g);
    for (let i = 0; i < arrstr.length; i++) {
      if (!arrstr[i]) continue;

      if (protocol.isError(arrstr[i])) {
        plugin.log('ERROR! ' + arrstr[i]);
        return;
      }

      if (arrstr[i].indexOf('#', 2) > 0) {
        // несколько ответов в одной строке: #RID,ALL,#PSW,SET,OK
        let arrsubstr = arrstr[i].split('#');
        for (var j = 0; j < arrsubstr.length; j++) {
          result += processDataItem('#' + arrstr[j]);
        }
      } else {
        result += processDataItem(arrstr[i]);
      }
    }

    sendDataToServer(result);
  }

  function sendDataToServer(payload) {
    if (!payload) return;
    let data;
    if (util.isArray(payload)) {
      data = payload;
    } else if (typeof payload == 'string') {
      // adr=val&adr=val&... => {adr:val, ..}
      let robj = qr.parse(payload);

      // Преобразуем {adr:val, ..} => [{id:'1', value:'1'}]
      // ЕСЛИ adr повторяется - то создается массив значений! {'IN_1':['1','0']..}!
      // В этом случае берем последнее значение
      if (robj) {
        data = Object.keys(robj).map(adr => ({
          id: adr,
          value: util.isArray(robj[adr]) ? robj[adr].pop() : robj[adr]
        }));
      }
    }

    if (!data) return;
    plugin.sendData(data);
  }

  function processDataItem(str) {
    return isWaiting(str) ? '' : protocol.parse(str, switching, plugin.jerome);
  }

  function stop() {
    if (client) client.end();
  }

  function sendNext() {
    if (tosend.length > 0) {
      let item = tosend.shift();
      if (item && item.req) {
        waiting.push({ req: item.req, res: item.res, ts: Date.now() });
        sendToUnit(item.req);
      }
    }
  }

  function sendToUnit(command) {
    if (command) {
      plugin.log('<= $KE,' + command, 2);
      client.write('$KE,' + command + '\r\n');
    }
  }

  // Ответ не пришел, потеря связи?
  function checkResponse() {
    if (!waiting.length) return;

    let ts = Date.now();
    if (ts - waiting[0].ts > 500) {
      const msStr = String(ts - waiting[0].ts);
      const errStr =  'Error: Sent ' + waiting[0].req +  ', expect ' +waiting[0].res;
      return errStr+ '. No response for ' +msStr+' ms';
    }
  }

  function isWaiting(str) {
    let key = protocol.getResKey(str);

    for (let i = 0; i < waiting.length; i++) {
      if (waiting[i].res == key) {
        // Ответ на команду
        if (protocol.isChannelsRes(key)) {
          // Пришла конфигурация - передать на сервер
          let data = protocol.getChannels(str);

          if (typeof data == 'object') {
            plugin.sendToServer('channels', data);
          } else {
            plugin.log('ERROR getChannels: ' + data);
          }
        } else if (waiting[i].done) {
          sendDataToServer(waiting[i].done);
        }

        waiting.splice(i, 1);
        sendNext();
        return true;
      }
    }
  }

  function getHostPortStr() {
    plugin.log('getHostPortStr '+util.inspect(plugin.params.data));
    return host + ':' + port;
  }

  // {id:adr, command:on/off/set, value:1}
  function doAct(item) {
    if (item.id) {
      let value = item.value;
      if (item.command == 'on' || item.command == 'off') {
        value = item.command == 'on' ? 1 : 0;
      }

      // Передать команду
      doCommand(item.id, value);

      // и на сервер передать что сделали? или придет самотеком?
      // НЕТ!! ДОЛЖЕН ПРИДТИ ОТВЕТ -
      plugin.sendData([{ id: item.id, value }]);
    }
  }
  /** Команды управления
   *   Входное сообщение: adr='IO_1', val=1
   **/
  function doCommand(adr, val) {
    let arra = adr.split('_');
    if (!arra) return;

    let cmdObj = protocol.formCmdObj(arra[0], arra[1], val);
    if (cmdObj && cmdObj.req) {
      waiting.push(cmdObj);
      sendToUnit(cmdObj.req);
      switching[arra[1]] = 1;
    }
  }

  // --- События плагина ---
  /**  act
   * Получил от сервера команду(ы) для устройства - отправить на контроллер
   * @param {Array of Objects} - data - массив команд
   */
  plugin.onAct(message => {

    if (!message || !message.data) return;
    message.data.forEach(item => doAct(item));
  });

  plugin.on('exit', () => {
    stop();
  });
};
