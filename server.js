const http = require("http");
const https = require("https");
const server = http.createServer();

const port = process.argv[2] || '3000';

class TimeStory {
    constructor(string) {
        this.string = string,
            this.getLink = function () {
                //returns text between the href = '....'
                let hrefRegex = /<a([^>]*?)href\s*=\s*(['"])([^\2]*?)\2\1*>/i;
                return `https://www.time.com${hrefRegex.exec(this.string)[3]}`;
            },
            this.getTitle = function () {
                //Returns substring between startString and endString
                let startString = `<h3 class="latest-stories__item-headline">`;
                let endString = `</h3>`;
                return (string.match(new RegExp(startString + "(.*)" + endString))[1]);
            };
    }
}

async function getSubstrings(string) {

    //Create array of indices to slice strings between
    const arrayOfindices =  createStringIndicesForLatestStories(string);
    //The indices contain the start and end index of consecutive substrings we need to parse 
    let substrings = [];
    //indices.length-1 is because we have only 6 articles
    for (let i = 0; i < arrayOfindices.length - 1; i++) {
        substrings.push(string.slice(arrayOfindices[i], arrayOfindices[i + 1]))
    }
    return substrings;
}


// Helper function
// Returns array containing starting indices  of strings starting with 'latest-stories__item'
function createStringIndicesForLatestStories(string) {
    //Finding indices of the matched strings
    let regex = /latest-stories__item/g, result, indices = [];
    //Indices - array containing all matching 'latest-stories__item' string
    let counter = 0;
    while ((result = regex.exec(string))) {
        if (counter % 3 === 0) {
            indices.push(result.index);
        }
        //this will contain an array of 18 elements containing latest-stories__item  but we require only every third
        counter = counter + 1
    }
    //since last element does not have end index have added 250 characters as extra
    indices.push(indices[indices.length - 1] + 250)
    return indices;
}


function httpGetRequest(url) {
    return new Promise((resolve, reject) => {
      https.get(url, function (response) {
        //if redirect follow redirect
        if (response.statusCode === 301 || response.statusCode === 302) {
          resolve(httpGetRequest(response.headers.location));
          return
        }
        //In case of success redirection
        let body = "";
        response.on("data", function (data) {
          body += data;
        })
        response.on("end", function () {
          resolve(body);
        })
  
      })
    });
  }

server.on("request", async (req, res) => {
    try {
        if (req.url === '/getTimeStories' && req.method === 'GET') {
            const html = await httpGetRequest("https://www.time.com");
            //Return html substrings containing information for each story 
            let substrings = await getSubstrings(html);
            //Final payload object
            let data = [];
            for (let htmlsubstring of substrings) {
                //Format this html substring to only get back title and link
                const story = new TimeStory(htmlsubstring);
                data.push({
                    title: story.getTitle(),
                    link: story.getLink()
                })
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.write(JSON.stringify(data));
            res.end();
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.write(JSON.stringify({
                msg: 'The requested URL was not found',
                code: 404
            }))
            res.end();
        }
    }
    catch (err) {
        console.error(err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.write(JSON.stringify({
            msg: 'Encountered Server Error',
            code: 500
        }))
        res.end();
    }
})

server.listen(port, async () => {
    console.log(`Listening at port ${port}`);
    console.log(`Visit http://localhost:${port}/getTimeStories`);
})