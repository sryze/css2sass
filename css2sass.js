#!/usr/bin/env node

const fs = require('fs');
const {parseRules, createRuleTree, printRuleTree} = require('./lib/css2sass');

const inputFile = process.argv.length >= 3 ? process.argv[2] : process.stdin.fd;
const css = fs.readFileSync(inputFile, 'utf-8');
const rules = parseRules(css);

console.log(printRuleTree(createRuleTree(rules)));