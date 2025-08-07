const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let isPaused = false;

rl.question('Nombre del grupo: ', groupName => {
    rl.question('Número del contacto (ej: 573001112233): ', contactNumber => {
        rl.question('Mensaje de respuesta: ', responseMessage => {
            const client = new Client({
                authStrategy: new LocalAuth(),
                puppeteer: {
                    args: ['--no-sandbox']
                }
            });

            client.on('qr', qr => {
                qrcode.generate(qr, { small: true });
            });

            client.on('ready', async () => {
                console.log('Bot listo, buscando grupo...');
                console.log('Logged in as:', client.info.wid.user);

                const group = await client.getChats({ limit: 100 }).then(chats => {
                    const groups = chats.filter(chat => chat.isGroup);
                    console.log('Grupos encontrados:', groups.map(g => g.name));
                    return groups.find(chat => 
                        chat.name.toLowerCase().includes(groupName.toLowerCase().trim())
                    );
                });

                if (!group) {
                    console.log('❌ No se encontró el grupo');
                    process.exit(1);
                }

                console.log(`✅ Escuchando mensajes de ${contactNumber} en el grupo "${group.name}"`);

                client.on('message', async msg => {
                    if (isPaused) {
                        return;
                    }
                    if (msg.from === group.id._serialized && msg.author === `${contactNumber}@c.us`) {
                        msg.reply(responseMessage);
                    }
                });

                // Add command handling for pause, resume, exit
                const handleCommand = (command) => {
                    command = command.trim().toLowerCase();
                    switch (command) {
                        case 'pause':
                            isPaused = true;
                            console.log('Bot paused. Messages will be ignored.');
                            break;
                        case 'resume':
                            isPaused = false;
                            console.log('Bot resumed.');
                            break;
                        case 'exit':
                            console.log('Exiting...');
                            client.destroy();
                            rl.close();
                            process.exit(0);
                            break;
                        default:
                            console.log('Unknown command. Available: pause, resume, exit');
                    }
                    rl.prompt();
                };

                rl.setPrompt('Bot command (pause/resume/exit): ');
                rl.prompt();
                rl.on('line', handleCommand);
            });

            client.initialize();
        });
    });
});
