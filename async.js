const http = require('http');
const fs = require('fs');
const querystring = require('querystring');
const url = require('url');
const prependHttp = require('prepend-http');
const req = require('request');
const cheerio = require('cheerio');
const async = require('async');

const server = http.createServer(doOnRequest);

function doOnRequest(request, response) {


    const regex = new RegExp(/\/I\/want\/title(?:\/?|.*)$/);
    let addresses = querystring.parse(url.parse(request.url).query).address;


    if (request.method === 'GET' && regex.test(request.url) && addresses) {
        if (typeof (addresses) === 'string') {
            addresses = [addresses];
        }

        response.writeHead(200, {
            'Content-Type': 'text/html'
        });

        async.waterfall([
            async.constant(addresses),
            setAddress,
            buildHTML,
            writeHTMLFile,
        ], function (err, data) {
            if (err) {
                console.error(err);
            }
            else {
                response.write(data);
            }
            response.end();
        });

    } else if (!addresses) {
        response.statusCode = 200;
        response.write('Add a query to view a list of addresses.');
        response.end();
    }
    else {
        response.statusCode = 404;
        response.write('404 - Not Found. Try a different path.');
        response.end();
    }


}

function setAddress(addresses, callback) {
    let results = [];
    let count = 0;

    const fetchContents = function (address, onComplete) {

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
        req(options, function (error, response, body) {

            if (error) {
                console.error('error while fetching:', error);
                results.push(` ${path} - NO RESPONSE`);

            } else {
                const $ = cheerio.load(body);
                results.push(` ${path} - ` + $('title').text());
            }

            if (results.length === addresses.length) {
                onComplete(results);
            }
        });


    }


    addresses.map((address) => fetchContents(address, function (result) {
        console.log('Fetching contents is now complete.');
        callback(null, result);
    }));

}

function buildHTML(addressList, callback) {
    const header = 'ASYNC.JS'
    const body = `<h1>List of titles of the given websites</h1>
    <ul>${addressList.map((address) => `<li>${address}</li>`).join('')}</ul>`;
    callback(null, `<!DOCTYPE html><html><head><title>${header}</title></head><body>${body}</body></html>`);
}

function writeHTMLFile(html, callback) {
    fs.writeFile('./index.html', html, function (err) {
        if (err) {
            console.log("An error occurred while trying to write to the file: ", err);
        }
    });
    callback(null, html);
}






server.listen(5555, "127.0.0.1");