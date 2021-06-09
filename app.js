const express = require('express');
const app = express();
const port = 3000;

app.get('/autocomplete', async function (request, response){
    const autoComplete = request.query.autocomplete;

    if(autoComplete !== null) {
        let results = await searchIsraelPost(autoComplete);
        response.json(results);
        response.end();
    } else {
        response.end();
    }
});

app.listen(port, function() {
    console.log(`App listening on port ${port}.`);
});