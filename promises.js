const http = require('http');
const fs = require('fs').promises;
const querystring = require('querystring');
const url = require('url');
const prependHttp = require('prepend-http');
const request = require('request-promise');
const cheerio = require('cheerio');

const server = http.createServer(doOnRequest);

async function doOnRequest(request, response) {
    let addresses = querystring.parse(url.parse(request.url).query).address;
    if (typeof (addresses) === 'string') {
        addresses = [addresses];
    }

    const regex = new RegExp(/\/I\/want\/title(?:\/?|.*)$/);


    if (request.method === 'GET' && regex.test(request.url) && addresses) {
        response.writeHead(200, {
            'Content-Type': 'text/html'
        });

        const contents = await Promise.all(addresses.map(async (address) => await fetchTitles(address)))
            .then(function (results) {
                const html = buildHTML(results);
                return writeHTMLFile('./index.html', html)
                    .then(file => {
                        return file;
                    })
                    .catch(error => {
                        console.log("An error occurred while trying to write to the file: ", error);
                    });
            }).catch(error => {
                console.error('Something went wrong ', error);
            });

        try {
            response.write(contents)
            response.end();
        } catch (error) {
            console.log('Could not write to response', error);
        }



    } else if (!addresses) {
        response.statusCode = 200;
        response.write('Add a query to view a list of addresses.');
        response.end();
    } else {
        response.statusCode = 404;
        response.write('404 - Not Found. Try a different path.');
        response.end();
    }

    request.on('error', (error) => {
        console.error('Bad request ', error);
    });


}

function buildHTML(addressList) {
    const header = 'PROMISES'
    const body = `<h1>List of titles of the given websites</h1>
    <ul>${addressList.map((address) => `<li>${address}</li>`).join('')}</ul>`;
    return `<!DOCTYPE html><html><head><title>${header}</title></head><body>${body}</body></html>`;
}


async function fetchTitles(address) {
    let path = address;
    let protocol = url.parse(address).protocol;
    if (!protocol) {
        path = prependHttp(address);
        protocol = 'https:';
    }
    const options = {
        uri: path,
        headers: {
            'User-Agent': 'request',
            encoding: null
        },
        transform: function (body) {
            return cheerio.load(body);
        }
    }
    console.log(`fetching ${address}`)
    return request(options)
        .then(function (cheerio) {
            return ` ${address} - ` + cheerio('title').text();

        }).catch(function (error) {
            console.error('An error while fetching:', error.cause); 
            console.error('Saving as NO RESPONSE'); 
            return ` ${address} - NO RESPONSE`;
        });

}


async function writeHTMLFile(path, html) {
    await fs.writeFile(path, html);
    return html;
}


server.on('error', (error) => {
    console.log('An error occurred in the server ', error);
});

server.listen(5555, "127.0.0.1");