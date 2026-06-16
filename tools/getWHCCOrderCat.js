import fs from 'fs';

async function getAuthentication() {
    const url = `${process.env.WHCC_ORDER_API_BASE_URL}/api/AccessToken`;
    const authData = {
        consumer_key: process.env.WHCC_ORDER_KEY,
        consumer_secret: process.env.WHCC_ORDER_SECRET,
        grant_type: "consumer_credentials"
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // Tells server to expect JSON
            },
            body: JSON.stringify(authData) // Converts JS object to JSON string
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const AuthResponse = await response.json();
            return AuthResponse;
        } catch (error) {
            console.error('Post error:', error);
    }
}

async function fetchCatalog(token) {
    const url = `${process.env.WHCC_ORDER_API_BASE_URL}/api/catalog`;

    try {
        const response = await fetch(url,{
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
    
        // Check if the HTTP status code is 200-299
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
    
        const catalogData = await response.json(); // Parse JSON response
        const filteredCatalog = {
            ...catalogData,
            Categories: catalogData.Categories.filter(category => category.Name === "Fine Art Prints")
        };

        return filteredCatalog;
    } catch (error) {
        console.error('Fetch error:', error);
    }
}


const auth = await getAuthentication();

const catalog = await fetchCatalog(auth.Token);

try {
    const jsonString = JSON.stringify(catalog, null, 2);
    fs.writeFileSync('whcc-catalog.json', jsonString, 'utf8');
    console.log("JSON file has been saved.");
} catch (err) {
    console.error("Error writing file:", err);
}