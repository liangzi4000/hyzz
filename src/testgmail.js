const gmail = require('./gmail');
(async () => {
    let otp = await gmail.GetTargetString();
    console.log(otp);
})()
