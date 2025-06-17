require('dotenv').config();

const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const gTTS = require('gtts');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.DISCORD_TOKEN;
const supportedLangs = ['vi', 'en', 'ja', 'fr', 'de'];

client.once('ready', () => {
    console.log(`🤖 Bot đã đăng nhập thành: ${client.user.tag}`);
    client.user.setActivity('Tiktok', { type: ActivityType.Watching });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith('!say')) {
        const args = message.content.slice(4).trim().split(' ');
        const lang = args.shift();
        const text = args.join(' ');

        if (!supportedLangs.includes(lang)) {
            return message.reply(`❌ Ngôn ngữ không hợp lệ. Hỗ trợ: ${supportedLangs.join(', ')}`);
        }

        if (!text) {
            return message.reply('❗ Bạn chưa nhập nội dung để đọc.');
        }

        if (!message.member.voice.channel) {
            return message.reply('⚠️ Bạn cần vào voice channel trước.');
        }

        const filename = `./voice_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.mp3`;
        const gtts = new gTTS(text, lang);

        gtts.save(filename, function (err) {
            if (err) {
                console.error(err);
                return message.reply('⚠️ Lỗi khi tạo file âm thanh.');
            }

            const connection = joinVoiceChannel({
                channelId: message.member.voice.channel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator
            });

            const player = createAudioPlayer();
            const resource = createAudioResource(filename);

            player.play(resource);
            connection.subscribe(player);

            player.on(AudioPlayerStatus.Idle, () => {
                connection.destroy();
                fs.unlinkSync(filename);
            });

            player.on('error', error => {
                console.error(`Lỗi phát âm thanh: ${error.message}`);
                connection.destroy();
                if (fs.existsSync(filename)) fs.unlinkSync(filename);
            });

            message.reply(`🔈 Đang đọc: "${text}" (${lang})`);
        });
    }
});

client.login(TOKEN);
