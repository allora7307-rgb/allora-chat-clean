import fs from 'fs';
const content = fs.readFileSync('server.js', 'utf8');
if (content.includes('v6.0')) {
    console.log('✅ server.js содержит v6.0');
} else {
    console.log('❌ server.js НЕ содержит v6.0');
}
