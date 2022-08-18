import fs from 'fs';
import path from 'path';

const curdir = path.dirname;
console.log(curdir);
const fullPath = path.join(__dirname, 'target_dir')
console.log(fullPath);

fs.readdir
