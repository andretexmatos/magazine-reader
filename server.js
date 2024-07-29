const express = require('express');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const bodyParser = require('body-parser');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');

const app = express();
const port = 80;

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/magazines.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'magazines.json'));
});

app.get('/magazine/:taglink', async (req, res) => {
    const taglink = req.params.taglink;
    const url = `https://fr.downmagaz.net/tags/${taglink}`;

    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);

        const magazines = [];

        $('.story').each((index, element) => {
            const title = $(element).find('.stitle a').text();
            const link = $(element).find('.stitle a').attr('href');
            let imgSrc = $(element).find('.stext img').attr('src');
            imgSrc = imgSrc.replace('minipost', 'fullstory').replace('.jpg', '.webp');
            const fullImgSrc = `https://fr.downmagaz.net${imgSrc}`;

            magazines.push({
                title,
                link,
                image: fullImgSrc
            });
        });

        res.json(magazines);
    } catch (error) {
        console.error('Error fetching magazine details:', error);
        res.status(500).send('An error occurred while fetching magazine details.');
    }
});

app.get('/turbo', async (req, res) => {
    const pageUrl = req.query.url;
    const url = decodeURIComponent(pageUrl);

    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);

        const turboLink = $('a[href*="turbo"]').attr('href');

        if (turboLink) {
            res.json({ turboLink });
        } else {
            res.status(404).json({ message: 'Turbo link not found' });
        }
    } catch (error) {
        console.error('Error fetching turbo link:', error);
        res.status(500).send('An error occurred while fetching turbo link.');
    }
});

app.post('/debrid', async (req, res) => {
    const { apiUrl, apiKey, turboLink } = req.body;

    try {
        const response = await axios.post(`${apiUrl}/downloader/add`, {
            url: turboLink
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        const downloadUrl = response.data.value.downloadUrl;
        const fileId = uuidv4();
        const filePath = path.join(__dirname, 'public', 'downloads', `${fileId}.pdf`);

        const writer = fs.createWriteStream(filePath);

        const downloadResponse = await axios.get(downloadUrl, {
            responseType: 'stream'
        });

        downloadResponse.data.pipe(writer);

        writer.on('finish', () => {
            res.json({ filePath: `/downloads/${fileId}.pdf` });
        });

        writer.on('error', (error) => {
            console.error('Error downloading the file:', error);
            res.status(500).send('An error occurred while downloading the file.');
        });
    } catch (error) {
        if (error.response && error.response.status === 503) {
            console.error('Service unavailable:', error.response.statusText);
            res.status(503).send('Service is temporarily unavailable. Please try again later.');
        } else {
            console.error('Error fetching download URL:', error);
            res.status(500).send('An error occurred while fetching download URL.');
        }
    }
});

// Schedule a job to clear the downloads folder every 15 minutes
cron.schedule('*/15 * * * *', () => {
    const downloadsDir = path.join(__dirname, 'public', 'downloads');

    fs.readdir(downloadsDir, (err, files) => {
        if (err) throw err;

        for (const file of files) {
            fs.unlink(path.join(downloadsDir, file), err => {
                if (err) throw err;
            });
        }
    });

    console.log('Downloads folder cleared');
});

app.listen(port, () => {
    console.log(`Le serveur écoute sur http://localhost:${port}`);
});
