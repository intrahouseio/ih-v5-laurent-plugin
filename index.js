/*
 * Laurent V5
 */

const util = require('util');

// const plugin = require('ih-plugin-api')();
const app = require('./app');

(async () => {
 
  let plugin;
  try {
    const opt = getOptFromArgs();
    const pluginapi = opt && opt.pluginapi ? opt.pluginapi : 'ih-plugin-api';
    plugin = require(pluginapi+'/index.js')();
    
    plugin.log('Laurent plugin has started.', 0);
    plugin.jerome = 0;
    // Получить каналы для подписки
    // plugin.channels = await plugin.channels.get();
    // plugin.log('Received channels...');
    // Пока просто отправить каналы
    // Отправить на сервер
    const channels = laurentChannels();
    plugin.send({ type: 'channels', data: channels });

    // Получить параметры
    plugin.params.data = await plugin.params.get();
    plugin.log('Received params ' + util.inspect(plugin.params.data));
    app(plugin);
  } catch (err) {
    plugin.exit(8, `Error: ${util.inspect(err)}`);
  }
})();

function laurentChannels() {
  return [
    { id: 'IN_1', desc: 'IN', order: 1, r:1 },
    { id: 'IN_2', desc: 'IN', order: 2, r:1 },
    { id: 'IN_3', desc: 'IN', order: 3, r:1 },
    { id: 'IN_4', desc: 'IN', order: 4, r:1 },
    { id: 'IN_5', desc: 'IN', order: 5, r:1 },
    { id: 'IN_6', desc: 'IN', order: 6, r:1 },
    { id: 'OUT_1', desc: 'OUT', order: 11, r:1, w:1 },
    { id: 'OUT_2', desc: 'OUT', order: 12, r:1, w:1 },
    { id: 'OUT_3', desc: 'OUT', order: 13, r:1, w:1 },
    { id: 'OUT_4', desc: 'OUT', order: 14, r:1, w:1 },
    { id: 'OUT_5', desc: 'OUT', order: 15, r:1, w:1 },
    { id: 'OUT_6', desc: 'OUT', order: 16, r:1, w:1 },
    { id: 'OUT_7', desc: 'OUT', order: 17, r:1, w:1 },
    { id: 'OUT_8', desc: 'OUT', order: 18, r:1, w:1 },
    { id: 'OUT_9', desc: 'OUT', order: 19, r:1, w:1 },
    { id: 'OUT_10', desc: 'OUT', order: 20, r:1, w:1 },
    { id: 'OUT_11', desc: 'OUT', order: 21, r:1, w:1 },
    { id: 'OUT_12', desc: 'OUT', order: 22, r:1, w:1 },
    { id: 'REL_1', desc: 'OUT', order: 31, r:1, w:1 },
    { id: 'REL_2', desc: 'OUT', order: 32, r:1, w:1 },
    { id: 'REL_3', desc: 'OUT', order: 33, r:1, w:1 },
    { id: 'REL_4', desc: 'OUT', order: 34, r:1, w:1 },
    { id: 'ADC_1', desc: 'ADC', order: 35, r:1 },
    { id: 'ADC_2', desc: 'ADC', order: 36, r:1 },
    { id: 'TMP', desc: 'TMP', order: 37, r:1 },
    { id: 'IMPL_1', desc: 'IMPL', order: 41, r:1 },
    { id: 'IMPL_2', desc: 'IMPL', order: 42, r:1 },
    { id: 'IMPL_3', desc: 'IMPL', order: 43, r:1 },
    { id: 'IMPL_4', desc: 'IMPL', order: 44, r:1 }
  ];
}


function getOptFromArgs() {
  let opt;
  try {
    opt = JSON.parse(process.argv[2]); //
  } catch (e) {
    opt = {};
  }
  return opt;
}