const http = require('http');
const fs = require('fs');
const querystring = require('querystring');
const url = require('url');
const prependHttp = require('prepend-http');
const request = require('request');
const cheerio = require('cheerio');

const server = http.createServer(doOnRequest);

function doOnRequest(request, response) {
    let addresses = querystring.parse(url.parse(request.url).query).address;
    if (typeof (addresses) === 'string') {
        addresses = [addresses];
    }

    const regex = new RegExp(/\/I\/want\/title(?:\/?|.*)$/);


    if (request.method === 'GET' && regex.test(request.url) && addresses) {
        response.writeHead(200, {
            'Content-Type': 'text/html'
        });

        fetchTitles(addresses, function (data) {
            response.write(data);
            response.end();
        });

    } else if (!addresses) {
        response.statusCode = 200;
        response.write('Add a query to view a list of addresses.');
        response.end();
    } else {
        response.statusCode = 404;
        response.write('404 - Not Found. Try a different path.');
        response.end();
    }


}

function buildHTML(addressList) {
    const header = 'CALLBACKS'
    const body = `<h1>List of titles of the given websites</h1>
    <ul>${addressList.map((address) => `<li>${address}</li>`).join('')}</ul>`;
    return `<!DOCTYPE html><html><head><title>${header}</title></head><body>${body}</body></html>`;
}

function fetchTitles(addressList, callback) {
    let results = [];
    let count = 0;
    addressList.map(address => {
        let path = address;
        let protocol = url.parse(address).protocol;

        if (!protocol) {
            path = prependHttp(address);
            protocol = 'https:';
        }
        const options = {
            url: path,
            headers: {
                'User-Agent': 'request',
                encoding: null
            }
        }
        console.log(`Fetching contents from ${path}...`);
        request(options, function (error, response, body) {
            count++;
            if (error) {

                console.error('error while fetching:', error);
                results.push(` ${address} - NO RESPONSE`);

            } else {

                const $ = cheerio.load(body);
                results.push(` ${address} - ` + $('title').text());
            }
            if (count === addressList.length) {

                const html = buildHTML(results);
                writeHTMLFile('./index.html', html);
                callback(html);

            }
        });


    });

}

function writeHTMLFile(path, html) {
    fs.writeFile(path, html, function (err) {
        if (err) {
            console.log("An error occurred while trying to write to the file: ", err);
        }
    });
}

server.listen(5555, "127.0.0.1");