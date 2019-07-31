const fs = require('fs');
const util = require('util');
const readline = require('readline');
const { google } = require('googleapis');
const URLSafeBase64 = require('urlsafe-base64');

const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.modify'];
// The file token.json stores the user's access and refresh tokens, and is created automatically when the authorization flow completes for the first time.
const TOKEN_PATH = 'token.json';

readline.Interface.prototype.question[util.promisify.custom] = function (prompt) {
    return new Promise(resolve =>
        readline.Interface.prototype.question.call(this, prompt, resolve),
    );
};
readline.Interface.prototype.questionAsync = util.promisify(readline.Interface.prototype.question);

module.exports = {
    GetTargetString: async function () {
        try {
            let credentials = await readFileAsync('credentials.json');
            let jsoncredentials = JSON.parse(credentials);
            const { client_secret, client_id, redirect_uris } = jsoncredentials.installed;
            const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
            if (!fs.existsSync(TOKEN_PATH)) {
                await getNewToken(oAuth2Client);
            }
            let token = await readFileAsync(TOKEN_PATH);
            oAuth2Client.setCredentials(JSON.parse(token));
            let result = await ExtractTargetStringFromMessages(oAuth2Client);
            return result;
        } catch (ex) {
            console.log('Error happened.', ex);
            return 0;
        }
    }
}

/**
 * Get and store new token after prompting for user authorization, and then 
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
async function getNewToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const code = await rl.questionAsync('Enter the code from that page here: ');
    rl.close();

    // This will provide an object with the access_token and refresh_token.
    // Save these somewhere safe so they can be used at a later time.
    const token = await oAuth2Client.getToken(code);
    console.log(token.tokens);
    await writeFileAsync(TOKEN_PATH, JSON.stringify(token.tokens));
}

/**
 * Lists the messages in the user's account.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function ExtractTargetStringFromMessages(auth) {
    const gmail = google.gmail({ version: 'v1', auth });
    try {
        let emaillist = await gmail.users.messages.list({
            userId: 'me',
            q: 'from:BRIDGEINFO@square-enix.com is:unread subject:[FFBE幻影戦争 WAR OF THE VISIONS　]メールアドレスの確認'
        });
        const messages = emaillist.data.messages;
        if (messages != null && messages.length) {
            for (let i = 0, j = messages.length; i < j; i++) {
                let email = await gmail.users.messages.get({
                    userId: 'me',
                    id: messages[i].id
                });
                let activationurl = URLSafeBase64.decode(email.data.payload.body.data).toString().match(/https:\/\/sqex-bridge.jp\/preregister\/.+\r\n/g);

                if (activationurl && activationurl[0]) {
                    await gmail.users.messages.modify({
                        userId: 'me',
                        id: messages[i].id,
                        resource: {
                            removeLabelIds: ['UNREAD']
                        }
                    });
                    return activationurl[0];
                }
            };
        } else {
            console.log('No message found.');
            return 0;
        }
    } catch (err) {
        console.log('The API returned an error: ' + err);
        return 0;
    }
}

/* How to use:
const gmail = require('./gmail');
(async () => {
    let str = await gmail.GetTargetString();
    console.log(str);
})()
 */