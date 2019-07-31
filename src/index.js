const puppeteer = require('puppeteer');
const config = require('./config.json');
const db = require('./database');
const common = require('./common');
const gmail = require('./gmail');

(async () => {
    const browser = await puppeteer.launch({
        headless: false, args: [
            '--start-maximized',
            //'--kiosk',
            //'--start-fullscreen',
            '--no-default-browser-check',
            '--no-first-run',
            '--disable-infobars',
            //'--disable-session-crashed-bubble',
            //'--incognito'
            '--aggressive-cache-discard',
            '--disable-cache',
            '--disable-application-cache',
            '--disable-offline-load-stale-cache',
            '--disk-cache-size=0',
        ],
        //slowMo:120
    });
    const page = await browser.newPage();
    await page.setViewport({ width: config.environment.resolution.width, height: config.environment.resolution.height });

    console.log('Get record from database');
    let result = await db.GetNextRecord();

    while (result.recordset.length == 1) {
        console.log('Open landing page');
        await page.goto(config.startupurl);

        console.log('Change open url in self page');
        await page.waitForSelector("#mvCol > div.mvColInner > div > ul.snsBtn > li:nth-child(3) > a");
        await page.$$eval("#mvCol > div.mvColInner > div > ul.snsBtn > li:nth-child(3) > a", (elems) => { elems.forEach((x) => { x.target = "_self"; }) });

        console.log('Click on pre-register button');
        await common.clickOn(page, '#mvCol > div.mvColInner > div > ul.snsBtn > li:nth-child(3) > a > img', false);

        console.log('Type email address');
        await common.typeOn(page, "#process_email", result.recordset[0].Email);

        console.log('Uncheck marketing options');
        await page.$$eval("#process_emailPermissionTitle_checkbox", (elems) => { elems.forEach(x => { x.checked = false; }) });
        await page.$$eval("#process_emailPermissionBridge_checkbox", (elems) => { elems.forEach(x => { x.checked = false; }) });

        console.log('Click on confirm button');
        await common.clickOn(page, '#submit_btn', false);

        console.log('Retrieve activation url from gmail');
        let activationurl = await gmail.GetTargetString();
        while (activationurl == 0) {
            await common.delay(2000);
            activationurl = await gmail.GetTargetString();
        }

        console.log("Open activation url");
        await page.goto(activationurl);
        await page.waitForFunction(() => { return document.querySelector('h1').textContent == "事前登録完了"; });
        await db.UpdateRecordStatus(result.recordset[0].Email);
        console.log(`Completed`);

        result = await db.GetNextRecord();
    }
    console.log('Done');
})();