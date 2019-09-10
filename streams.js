const http = require('http');
const req = require('request');
const querystring = require('querystring');
const url = require('url');
const prependHttp = require('prepend-http');
const Rx = require('rxjs');
const RxOp = require('rxjs/operators');
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


        Rx.from(addresses).pipe(
            RxOp.mergeMap(address => {
                return new Rx.Observable(observer => {
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
                    req(options, function (error, response, body) {
                        if (!error && response.statusCode == 200) {
                            const $ = cheerio.load(response.body);
                            const text = `${response.request.href} - ` + $('title').text();
                            observer.next(text)
                        }
                        else {
                            console.error(error);
                            observer.next(` ${address} - NO RESPONSE`)
                        }

                        observer.complete()
                    })
                })
            }),
            RxOp.reduce((htmlResponse, text) => {
                htmlResponse += '<li>' + text + '</li>';
                return htmlResponse;
            }, ''),
            RxOp.tap(htmlResponse => {
                response.writeHeader(200, { "Content-Type": "text/html" });
                const head = '<!DOCTYPE html><html><head><title>STREAMS - RXJS</title></head><body><h1>List of titles of the given websites</h1><ul>'
                response.write(head + htmlResponse + '</ul></body></html>')
                response.end()
            })
        ).subscribe();



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


server.on('error', (error) => {
    console.log('An error occurred in the server ', error);
});

server.listen(5555, "127.0.0.1");


