module.exports = {
    clickOn: function (selector) {
        $(selector).trigger('click');
    },
    tapOn: function (selector) {
        while (!$(selector)) {
            console.log(`waiting for ${selector}`);
        }
        $(selector).trigger('tap');
    },
    detectTutorial3: function () {
        let result = false;
        let elem = document.querySelector('#cjs-opening');
        if (elem) {
            let rect = elem.getBoundingClientRect();
            if (rect) {
                if (rect.height > 100) {
                    window.scrollBy(0, rect.height);
                    result = true;
                }
            }
        }
        return result;
    },
    triggerClickFrom: function (x, y) {
        document.elementFromPoint(x, y).click();
    }
}