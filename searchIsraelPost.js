const puppeteer = require('puppeteer');
const LOCATE_ZIPCODE_URL = "https://israelpost.co.il/%D7%A9%D7%99%D7%A8%D7%95%D7%AA%D7%99%D7%9D/%D7%90%D7%99%D7%AA%D7%95%D7%A8-%D7%9E%D7%99%D7%A7%D7%95%D7%93/";

const searchIsraelPost = async function(autoComplete) {
    const browser = await puppeteer.launch();

    const page = await browser.newPage();
    await page.goto(LOCATE_ZIPCODE_URL);

    await page.type("input#City", autoComplete);

    await page.waitForSelector("ul#ui-id-1 > li");

    const autoCompleteResults = await page.$$eval('ul#ui-id-1 > li > div', results => {
        // Array that holds all the cities' names.
        let cities = [];

        // Iterates over all the results.
        results.forEach(result => {
            const city = result.innerText;
            cities.push(city);
        });

        return cities;
    });

    await browser.close();

    return autoCompleteResults;
};

module.exports = searchIsraelPost;