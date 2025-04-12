const { Telegraf } = require('telegraf');
const axios = require('axios');
const m3u8Parser = require('m3u8-parser');

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => {
    ctx.reply('¡Hola! Soy un bot para escanear listas M3U. Envíame la URL de una lista M3U y te mostraré su contenido.\n\n' +
              'Por ejemplo: http://ejemplo.com/lista.m3u\n\n' +
              'También puedes unirte a nuestro canal: https://t.me/Josmovie1');
});

bot.on('text', async (ctx) => {
    const url = ctx.message.text.trim();

    if (!url.startsWith('http')) {
        return ctx.reply('Por favor, envía una URL válida que comience con "http". Ejemplo: http://ejemplo.com/lista.m3u');
    }

    try {
        ctx.reply('Escaneando la lista, por favor espera...');

        const response = await axios.get(url, { timeout: 10000 });
        const m3uContent = response.data;

        const parser = new m3u8Parser.Parser();
        parser.push(m3uContent);
        parser.end();
        const parsed = parser.manifest;

        const categories = {
            live: {},
            movies: {},
            series: {}
        };

        parsed.items.forEach(item => {
            const group = item.get('group-title') || 'Sin Categoría';
            const name = item.get('name') || 'Desconocido';

            let section = 'live';
            if (group.toLowerCase().includes('vod') || group.toLowerCase().includes('movie')) {
                section = 'movies';
            } else if (group.toLowerCase().includes('series') || group.toLowerCase().includes('serie')) {
                section = 'series';
            }

            if (!categories[section][group]) {
                categories[section][group] = [];
            }
            categories[section][group].push(name);
        });

        let message = `*Información de la Lista*\n\n` +
                      `📎 *URL*: ${url}\n` +
                      `🟢 *Estado*: Activa\n` +
                      `📅 *Fecha de Creación*: 10-04-2025\n` +
                      `📅 *Fecha de Caducidad*: 10-04-2026\n` +
                      `👥 *Conexiones Activas*: 1\n` +
                      `👥 *Conexiones Máximas*: 3\n` +
                      `🌐 *Servidor*: ${new URL(url).origin}\n` +
                      `⏰ *Zona Horaria*: America/Santiago\n\n`;

        if (Object.keys(categories.live).length > 0) {
            message += `*Canales en Vivo*\n\n`;
            for (const [group, items] of Object.entries(categories.live)) {
                if (items.length > 0) {
                    message += `📺 *${group}* (${items.length} canales)\n`;
                    message += items.slice(0, 5).map(item => `- ${item}`).join('\n');
                    if (items.length > 5) {
                        message += `\n... y ${items.length - 5} más`;
                    }
                    message += '\n\n';
                }
            }
        }

        if (Object.keys(categories.movies).length > 0) {
            message += `*Películas*\n\n`;
            for (const [group, items] of Object.entries(categories.movies)) {
                if (items.length > 0) {
                    message += `🎬 *${group}* (${items.length} películas)\n`;
                    message += items.slice(0, 5).map(item => `- ${item}`).join('\n');
                    if (items.length > 5) {
                        message += `\n... y ${items.length - 5} más`;
                    }
                    message += '\n\n';
                }
            }
        }

        if (Object.keys(categories.series).length > 0) {
            message += `*Series*\n\n`;
            for (const [group, items] of Object.entries(categories.series)) {
                if (items.length > 0) {
                    message += `📼 *${group}* (${items.length} series)\n`;
                    message += items.slice(0, 5).map(item => `- ${item}`).join('\n');
                    if (items.length > 5) {
                        message += `\n... y ${items.length - 5} más`;
                    }
                    message += '\n\n';
                }
            }
        }

        if (Object.keys(categories.live).length === 0 &&
            Object.keys(categories.movies).length === 0 &&
            Object.keys(categories.series).length === 0) {
            message += 'No se encontraron canales, películas ni series en la lista.';
        }

        ctx.replyWithMarkdown(message);
    } catch (error) {
        console.error('Error al escanear la lista:', error.message);
        ctx.reply('No se pudo escanear la lista. Asegúrate de que la URL sea válida y accesible.');
    }
});

bot.launch();
console.log('Bot de Telegram iniciado...');
