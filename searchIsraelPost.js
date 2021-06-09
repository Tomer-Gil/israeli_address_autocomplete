const puppeteer = require('puppeteer');
const fs = require("fs");
const randomUseragent = require("random-useragent");
const path = require("path");
const LOCATE_ZIPCODE_URL = "https://israelpost.co.il/%D7%A9%D7%99%D7%A8%D7%95%D7%AA%D7%99%D7%9D/%D7%90%D7%99%D7%AA%D7%95%D7%A8-%D7%9E%D7%99%D7%A7%D7%95%D7%93/";
const IS_RANDOM_USER_AGENT = false;
const IS_REFERER_HEADER = true;

const searchIsraelPost = async function(autoComplete) {
    let launchOptions = {
        env: {
            TZ: "UTC+3",
            ...process.env
        },
        // headless: false
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

    // Just make sure I'm not trying to delete a key which is not found.
        // Even though the delete operator will either way return true.
    if(!IS_REFERER_HEADER) {
        if(httpHeaders.hasOwnProperty("referer")) {
            console.assert(delete httpHeaders.referer, "Error while trying to remove the Referer header.");
        }
    }


    await page.setExtraHTTPHeaders({
        // 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36 OPR/56.0.3051.52',
        // 'user-agent': "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36",
        // 'user-agent': 'Opera/9.80 (Windows NT 6.1; WOW64) Presto/2.12.388 Version/12.18',
        'user-agent': randomUseragent.getRandom(),
        // 'upgrade-insecure-requests': '1',
        // "accept": "*/*",
        // 'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3,application/javascript',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'accept-encoding': 'gzip, deflate, br',
        // 'accept-language': 'en-US,en;q=0.9,en;q=0.8'
        'accept-language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
        // "referer": "https://israelpost.co.il/%D7%A9%D7%99%D7%A8%D7%95%D7%AA%D7%99%D7%9D/%D7%90%D7%99%D7%AA%D7%95%D7%A8-%D7%9E%D7%99%D7%A7%D7%95%D7%93/"
    });

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

    try {
        await page.type("input#City", autoComplete);

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
    } catch {
        console.log("Used random user-agent? " + IS_RANDOM_USER_AGENT);
        console.log("Used referer header? " + IS_REFERER_HEADER);
        return "Weird, city input wasn't found. " + parseInt(Math.random() * 100 + 1).toString();
    }
};

module.exports = searchIsraelPost;