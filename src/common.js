const clientscript = require('./clientscript')
const path = require('path');

module.exports = {
    delay: function (milliseconds) {
        return new Promise(function (resolve, milliseconds) {
            setTimeout(resolve, milliseconds);
        })
    },

    scrollToElem: async function (page, selector) {
        let elem = await page.$(selector);
        let isInViewport = await elem.isIntersectingViewport();
        if (!isInViewport) {
            await page.evaluate((selector) => {
                document.querySelector(selector).scrollIntoView(false);
            }, selector);
        }
    },

    clickOn: async function (page, selector, byjQuery = true) {
        console.log(`${path.basename(__filename)}: clickOn -> waitForSelector :${selector}`);
        await page.waitForSelector(selector, { visible: true });
        console.log(`${path.basename(__filename)}: scrollToElem()`);
        await this.scrollToElem(page, selector);
        if (byjQuery) {
            console.log(`${path.basename(__filename)}: clientscript.clickOn`);
            await page.evaluate(clientscript.clickOn, selector);
        } else {
            console.log(`${path.basename(__filename)}: page.click`);
            await page.click(selector);
        }
    },

    tapOn: async function (page, selector, byjQuery = true, delay = 1000) {
        console.log(`${path.basename(__filename)}: tapOn -> waitForSelector: ${selector}`);
        await page.waitForSelector(selector, { visible: true });
        console.log(`${path.basename(__filename)}: Scroll to element`);
        await this.scrollToElem(page, selector);
        await page.waitFor(delay); // Must wait for 1 second, or catch exception
        if (byjQuery) {
            console.log(`${path.basename(__filename)}: Execute browser script to perform tap`);
            this._tapOn_evalclientscript(page, selector);
        } else {
            console.log(`${path.basename(__filename)}: Execute puppeteer script to perform tap`);
            await page.tap(selector);
        }
    },

    _tapOn_evalclientscript: async function (page, selector) {
        try {
            await page.evaluate(clientscript.tapOn, selector);
        } catch (err) {
            if (err.message.indexOf(_errmessage1) > -1) {
                await this._tapOn_evalclientscript(page, selector);
            } else {
                throw err;
            }
        }
    },

    typeOn: async function (page, selector, text, overwrite = false) {
        console.log(`${path.basename(__filename)}: typeOn ${selector}`);
        await page.waitForSelector(selector, { visible: true });
        await page.focus(selector);
        if (overwrite) {
            await page.keyboard.down('Control');
            await page.keyboard.down('a');
            await page.keyboard.up('Control');
            await page.keyboard.up('a');
            await page.press('Backspace');
        }
        await page.type(selector, text);
    },

    selectOn: async function (page, selector, value) {
        await page.waitFor(selector);
        await page.select(selector, value);
    },

    waitForUrl: async function (page, urlkeyword) {
        await page.waitForFunction((urlkeyword) => {
            return window.location.href.indexOf(urlkeyword) > -1;
        }, { polling: 500 }, urlkeyword);
    },

    tapUntil: async function (page, tapselector, targetselector, istargetelemexist = false) {
        let target = await page.$(targetselector);
        while (target == null) {
            await this.tapOn(page, tapselector);
            target = await page.$(targetselector);
        }
        if (istargetelemexist) {
            while ((await target.isIntersectingViewport()) == false) {
                await this.tapOn(page, tapselector);
            }
        }
    }
}