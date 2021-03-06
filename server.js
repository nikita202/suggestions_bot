const Telegram = require('telegram-bot-api');
const CHANNEL_ID = "LIcseiST";
const GROUP_ID = -1001479885834;
const blocked = [];
const messages = {};
const LIMIT = 5;
const TIME = 60 * 1000;

function getAcceptedResponse() {
    let items = [
        "Готово!",
        "Принято.",
        "Ваш пост был принят к рассмотрению."
    ];
    return items[Math.floor(Math.random() * items.length)];
}

Array.prototype.remove = function() {
    let what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

const args = {};
for (let arg of process.argv.slice(2)) {
    let arr = arg.split("=");
    if (arr.length === 1) {
        args[arr[1]] = "";
    } else {
        for (let key of arr.slice(0, arr.length - 1)) {
            args[key] = arr[arr.length - 1];
        }
    }
}
if (args.debug === 'true') console.log(args);

const api = new Telegram({
    token: '984905778:AAGGx-qC5VRb9PyCO-IelYM8TVqAbaFkIGw',
    updates: {
        enabled: true
    }
});

function replyToMessage(msg, text) {
        api.sendMessage({
            chat_id: msg.chat.id,
            text: text,
            reply_to_message_id: msg.message_id
        }).catch(console.log);
}

const CommandProcessor = new (require('./commandsprocessor'))([
    {
        name: "help",
        description: "Помогает с пониманием команд",
        usage: "help ?command",
        action: function (msg, arguments, self) {
            if (arguments.length === 0) {
                let string = 'Все комманды:\n\t';
                let commandNames = [];
                self.commands.forEach(command => {commandNames.push(command.name)});
                string += commandNames.join('\n\t');
                replyToMessage(msg, string);
            } else if (arguments.length === 1) {
                let command = arguments[0].value;
                let commandObject = undefined;
                self.commands.forEach(comm => {
                    if (comm.name === command.toLowerCase()) commandObject = comm;
                });
                if (typeof commandObject === "undefined") throw {message: "Такая команда не существует"};
                let string = "Название команды: " + commandObject.name + "\nОписание команды: " + commandObject.description + "\nИспользование команды: " + commandObject.usage + (commandObject.adminOnly ? "\nТолько для администраторов!" : "");
                replyToMessage(msg, string)
            }
        }
    },
    {
        name: "block",
        description: "Не дает даунам присылать хуйню",
        usage: "block <user id>",
        action: function (msg, arguments, self) {
            if (arguments.length === 0) {
                replyToMessage(msg, "Недостаточно аргументов!")
            } else {
                let toBlock = arguments[0].value;
                if (!isNaN(parseInt(toBlock))) {
                    if (blocked.some(id => id == parseInt(toBlock))) {
                        replyToMessage(msg, "Пользователь с ID " + toBlock + " уже заблокирован!")
                    } else {
                        blocked.push(parseInt(toBlock));
                        replyToMessage(msg, "Пользователь с ID " + toBlock + " заблокирован!")
                    }
                } else replyToMessage(msg,"Первый аргумент должен быть числом");
            }
        }
    },
    {
        name: "unblock",
        description: "Разрешает заблокированным даунам продолжать слать хуйню",
        usage: "unblock <user id>",
        action: function (msg, arguments, self) {
            if (arguments.length === 0) {
                replyToMessage(msg, "Недостаточно аргументов!")
            } else {
                let toBlock = arguments[0].value;
                if (!isNaN(parseInt(toBlock))) {
                    if (blocked.some(id => id == parseInt(toBlock))) {
                        blocked.remove(parseInt(toBlock));
                        replyToMessage(msg, "Пользователь с ID " + toBlock + " разблокирован!")
                    } else {
                        replyToMessage(msg, "Пользователь с ID " + toBlock + " не заблокирован!")
                    }
                } else replyToMessage(msg, "Первый аргумент должен быть числом");
            }
        }
    }
]);

api.on('message', function (message) {
    if (args.debug === 'true') console.log(message);
    if (message.chat.type === "private") {
        if (message.text !== "/start") {
            if (args.debug === 'true') console.log(blocked);
            if (args.debug === 'true') console.log(message.chat.id);
            if (args.debug === 'true') console.log(blocked.some(id => id == message.chat.id));
            if (!blocked.some(id => id == message.chat.id)) {
                if (args.debug === 'true') console.log(messages);
                if (messages[message.chat.id]) {
                    let data = messages[message.chat.id];
                        if (data.time + TIME < Date.now()) {
                            messages[message.chat.id] = {
                                time: Date.now(),
                                count: 0,
                            };
                        }
                        if (data.count < LIMIT) {
                            data.count++;
                            react();
                        }
                } else {
                    messages[message.chat.id] = {
                        time: new Date().getTime(),
                        count: 1,
                    };
                    react();
                }

                function react() {
                    replyToMessage(message, getAcceptedResponse());
                    api.forwardMessage({
                        chat_id: GROUP_ID,
                        from_chat_id: message.chat.id,
                        message_id: message.message_id
                    }).then(function (data) {
                        if (args.debug === 'true') console.log(data);
                        api.sendMessage({
                            chat_id: GROUP_ID,
                            text: "Предложение от " + generateString(message.chat),
                            reply_to_message_id: data.message_id
                        }).catch(console.log);
                    }).catch(console.log);
                }
            } else {
                replyToMessage(message, "Вы были заблокированы по причине спама! Для получения подробной информации обращайтесь к администрации @" + CHANNEL_ID)
            }
        } else api.sendMessage({
            chat_id: message.chat.id,
            text: "Привет! Это бот-предложка для канала @" + CHANNEL_ID + ". Сюда ты можешь прислать контент для публикации на канале.",
        }).catch(console.log)
    } else if (message.chat.id == GROUP_ID) {
        if (message.text.startsWith("/")) {
            let command = message.text.slice(1);
            CommandProcessor.process(command, message);
        }
    }
});

function generateString(chat) {
    let message = "";
    if (chat.first_name) message += chat.first_name + " ";
    if (chat.last_name) message += chat.last_name + " ";
    if (chat.username) message += "@" + chat.username + " ";
    if (chat.id) message += "(id: " + chat.id + ") ";
    return message;
}