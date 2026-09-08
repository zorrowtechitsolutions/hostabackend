const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src', 'services');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  let updated = false;

  // Replace user-service style
  if (content.match(/const response: any = await breaker\.fire\(options\);\s*res\.status\(response\.status\)\.json\(\{[\s\S]*?\}\);/)) {
    content = content.replace(
      /const response: any = await breaker\.fire\(options\);\s*res\.status\(response\.status\)\.json\(\{[\s\S]*?\}\);/,
      `const response: any = await breaker.fire(options);

    if (response.headers && response.headers['set-cookie']) {
      res.setHeader('Set-Cookie', response.headers['set-cookie']);
    }

    res.status(response.status).json(response.data);`
    );
    updated = true;
  }

  // Replace staff-service style
  if (content.match(/const response: any = await breaker\.fire\(options\);\s*(?:\/\/.*?\n\s*)?return res\.status\(response\.status\)\.json\(response\.data\);/)) {
    content = content.replace(
      /const response: any = await breaker\.fire\(options\);\s*(?:\/\/.*?\n\s*)?return res\.status\(response\.status\)\.json\(response\.data\);/,
      `const response: any = await breaker.fire(options);

    if (response.headers && response.headers['set-cookie']) {
      res.setHeader('Set-Cookie', response.headers['set-cookie']);
    }

    return res.status(response.status).json(response.data);`
    );
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated', file);
  }
});
