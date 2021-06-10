const puppeteer = require('puppeteer');
const fs = require("fs");
const randomUseragent = require("random-useragent");
const path = require("path");
const LOCATE_ZIPCODE_URL = "https://israelpost.co.il/%D7%A9%D7%99%D7%A8%D7%95%D7%AA%D7%99%D7%9D/%D7%90%D7%99%D7%AA%D7%95%D7%A8-%D7%9E%D7%99%D7%A7%D7%95%D7%93/";
const IS_RANDOM_USER_AGENT = false;
const IS_REFERER_HEADER = true;
const IS_COOKIE_HEADER = false;

const searchIsraelPost = async function(autoComplete) {
    let launchOptions = {
        env: {
            TZ: "UTC+3",
            ...process.env
        },
        headless: false
    }
    const browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();

    let httpHeaders = await new Promise(function(resolve, reject) {
        fs.readFile(path.join(__dirname, "httpHeaders.txt"), {encoding: "utf-8"}, function(err, data) {
            if(err) {
                reject("Error:\n" + err);
            } else {
                resolve(data);
            }
        });
    });
    httpHeaders = httpHeaders.split("\r\n").reduce(function(obj, currentHeader) {
        let [name, value] = currentHeader.split(": ");
        // hasOwnProperty is case-sensitive, so make sure all headers' names and values are lower-case.
        [name, value] = [name, value].map(function(value) {
            return value.toLowerCase();
        });
        obj[name] = value;
        return obj;
    }, {});

    // Make sure the User-Agent header is random each request.
    if(IS_RANDOM_USER_AGENT) {
        if(httpHeaders.hasOwnProperty("user-agent")) {
            // Using .user-agent is not possible due to the hyphen.
            httpHeaders["user-agent"] = randomUseragent.getRandom();
        }
    }

    if(!IS_REFERER_HEADER) {
        // Just make sure I'm not trying to delete a key which is not found.
            // Even though the delete operator will either way return true.
        if(httpHeaders.hasOwnProperty("referer")) {
            console.assert(delete httpHeaders.referer, "Error while trying to remove the Referer header.");
        }
    }

    if(!IS_COOKIE_HEADER) {
        // Just make sure I'm not trying to delete a key which is not found.
            // Even though the delete operator will either way return true.
        if(httpHeaders.hasOwnProperty("cookie")) {
            console.assert(delete httpHeaders.cookie, "Error while trying to remove the Cookie header.");
        }
    }

    await page.setExtraHTTPHeaders(httpHeaders);

    await page.setRequestInterception(true);
    page.on("request", request => {
        // console.log(request);
        request.continue();
    });

    let files = await new Promise(function(resolve, reject) {
        fs.readdir(__dirname, function(err, files) {
            if(err) {
                reject(`Unable to scan directory ${__dirname}: ` + err);
            } else {
                files = files.filter(function(fileName) {
                    return /^example[0-9]+\.png/.test(fileName);
                });
                resolve(files);
            }
        });
    });

    files = files.sort(function(a, b) {
        return parseInt(/[0-9]+/.exec(a)[0]) - parseInt(/[0-9]+/.exec(b)[0]);
    });

    const newestFile_number = parseInt(/[0-9]+/.exec(files[files.length - 1])[0]) + 1;

    await page.goto(LOCATE_ZIPCODE_URL);
    await page.screenshot({path: `example${newestFile_number}.png`});

    var isCityInputFound = true;
    try {
        await page.click("body > div.container > div:nth-child(2) > div.captcha-mid > form > center > input");
        await page.click("#recaptcha-anchor > div.recaptcha-checkbox-checkmark");
        console.log("Capatcha found.");
    } catch(e) {
        console.error(e);
    } finally {
        try {
            await page.type("input#City", autoComplete);
            console.log("City input found.");
        } catch(e) {
            console.error(e);
            isCityInputFound = false;
        } finally {
            console.log("Used random user-agent? " + IS_RANDOM_USER_AGENT);
            console.log("Used referer header? " + IS_REFERER_HEADER);
            console.log("Used cookie header? " + IS_COOKIE_HEADER);
            if(!isCityInputFound) {
                return "Weird, city input wasn't found. " + parseInt(Math.random() * 100 + 1).toString();
            } else {
                await page.waitForSelector("#ui-id-1 > li");

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

                console.log("Results:\n" + autoCompleteResults);

                return autoCompleteResults;
            }
        }
    }
};

module.exports = searchIsraelPost;