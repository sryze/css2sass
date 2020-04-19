#!/usr/bin/env node

const fs = require('fs');

function parseRules(css) {
    const RE_SELECTOR = /[\sa-zA-Z0-9\.\-+>*#:=()\[\]"']/;
    const RE_PROPERTY = /[a-zA-Z0-9-]/;
    const RE_WHITESPACE = /[\s\r\n]/;

    const ST_TOP = 'TOP';
    const ST_SEL = 'SEL';
    const ST_SEL_COMMA = 'SEL_COMMA';
    const ST_SEL_IN = 'SEL_IN';
    const ST_SEL_PROP = 'SEL_PROP';
    const ST_SEL_PROP_WS = 'SEL_PROP_WS';
    const ST_SEL_PROP_COLON = 'SEL_PROP_COLON';
    const ST_SEL_PROP_VALUE = 'SEL_PROP_VALUE';

    let lineNum = 1;
    let colNum = 1;
    let c;
    let state = ST_TOP;
    let selector = '';
    let property = '';
    let value = '';
    let selectors = [];
    let properties = [];
    const rules = [];

    function error() {
        throw new Error(`Unexpected character '${c}' at line ${lineNum}, column ${colNum}`);
    }

    function beginProperty() {
        property = '';
        value = '';
    }

    function endSelector() {
        selectors.push(parseSelector(selector.trim()));
    }

    function endProperty() {
        properties.push({name: property, value: value});
        beginProperty();
    }

    function beginRuleProperties() {
        properties = [];
    }

    function beginRule() {
        selectors = [];
        beginRuleProperties();
    }

    function endRule() {
        rules.push({selectors, properties});
        beginRule();
    }

    beginRule();

    for (let i = 0; i < css.length; i++) {
        c = css[i];
        // console.log(i, state);
        // console.log('c: "' + c + '"`');

        switch (state) {
            case ST_TOP:
                if (RE_WHITESPACE.test(c)) {
                    // ignore
                } else if (RE_SELECTOR.test(c)) {
                    selector = c;
                    state = ST_SEL;
                } else if (c == '{') {
                    state = ST_SEL_IN;
                    endSelector();
                    beginRuleProperties();
                } else {
                    error();
                }
                break;
            case ST_SEL:
                if (RE_SELECTOR.test(c)) {
                    selector += c;
                } else if (c == ',') {
                    state = ST_SEL_COMMA;
                    endSelector();
                } else if (c == '{') {
                    state = ST_SEL_IN;
                    endSelector();
                    beginRuleProperties();
                } else {
                    error();
                }
                break;
            case ST_SEL_COMMA:
                if (RE_WHITESPACE.test(c)) {
                    // ignore
                } else if (RE_SELECTOR.test(c)) {
                    selector = c;
                    state = ST_SEL;
                }
                break;
            case ST_SEL_IN:
                if (RE_WHITESPACE.test(c)) {
                    // ignore
                } else if (RE_PROPERTY.test(c)) {
                    state = ST_SEL_PROP;
                    property = c;
                } else if (c == '}') {
                    state = ST_TOP;
                    endRule();
                } else {
                    error();
                }
                break;
            case ST_SEL_PROP:
                if (RE_PROPERTY.test(c)) {
                    property += c;
                } else if (RE_WHITESPACE.test(c)) {
                    state = ST_SEL_PROP_WS;
                } else if (c == ':') {
                    state = ST_SEL_PROP_COLON;
                } else {
                    error();
                }
                break;
            case ST_SEL_PROP_WS:
                if (RE_WHITESPACE.test(c)) {
                    // ignore
                } else if (c == ':') {
                    state = ST_SEL_PROP_COLON;
                } else {
                    error();
                }
                break;
            case ST_SEL_PROP_COLON:
                if (RE_WHITESPACE.test(c)) {
                    // ignore
                } else if (c == '}') {
                    state = ST_TOP;
                    endProperty();
                    endRule();
                } else if (c == ';') {
                    state = ST_SEL_IN;
                    endProperty();
                } else {
                    state = ST_SEL_PROP_VALUE;
                    value = c;
                }
                break;
            case ST_SEL_PROP_VALUE:
                if (c == '}') {
                    state = ST_TOP;
                    endProperty();
                    endRule();
                } else if (c == ';') {
                    state = ST_SEL_IN;
                    endProperty();
                } else {
                    value += c;
                }
                break;
        }

        if (c == '\n') {
            lineNum++;
            colNum = 1;
        } else {
            colNum++;
        }
    }

    return rules;
}

function parseSelector(s) {
    const RE_ALPHA = /\w/;
    const RE_DELIM = /([.+~>:]|::)/;
    const RE_ID = /[a-zA-Z0-9-]/;
    const RE_WHITESPACE = /[\s\r\n]/;

    const ST_DELIM = 'DELIM';
    const ST_ID = 'ID';
    const ST_CLASS = 'CLASS';
    const ST_PCLASS = 'PCLASS';
    const ST_PCLASS_IN = 'PCLASS_IN';
    const ST_TAG = 'TAG';
    const ST_ATTR = 'ATTR';
    const ST_ATTR_IN = 'ATTR_IN';

    let c;
    let state = ST_DELIM;
    let selector = '';
    const components = [];

    function error() {
        throw new Error(`Unexpected character '${c}' in '${s}'`);
    }

    function endComponent() {
        if (!selector) {
            return;
        }

        switch (state) {
            case ST_TAG:
                components.push({selector, type: 'tag'});
                break;
            case ST_ID:
                components.push({selector, type: 'id'});
                break;
            case ST_CLASS:
                components.push({selector, type: 'class'});
                break;
            case ST_PCLASS:
                components.push({selector, type: 'pclass'});
                break;
            case ST_ATTR:
                components.push({selector, type: 'attribute'});
                break;
        }

        selector = '';
    }

    for (let i = 0; i < s.length; i++) {
        c = s[i];
        // console.log(c, state);

        switch (state) {
            case ST_DELIM:
                if (RE_WHITESPACE.test(c)) {
                    if (c == ' ' || c == '\t') {
                        selector += c;
                    }
                } else {
                    if (c == '#') {
                        state = ST_ID;
                    } else if (c == '.') {
                        state = ST_CLASS;
                    } else if (c == ':') {
                        state = ST_PCLASS;
                    } else if (RE_ALPHA.test(c)) {
                        state = ST_TAG;
                    } else if (RE_DELIM.test(c)) {
                        // ok?
                    } else {
                        error();
                    }
                    selector += c;
                }
                break;
            case ST_TAG:
            case ST_ID:
            case ST_CLASS:
            case ST_PCLASS:
            case ST_ATTR:
                if (RE_WHITESPACE.test(c)) {
                    endComponent();
                } else if (RE_DELIM.test(c)) {
                    endComponent();
                    i--;
                    state = ST_DELIM;
                } else if (RE_ID.test(c)) {
                    selector += c;
                } else if (c == '(' && state == ST_PCLASS) {
                    state = ST_PCLASS_IN;
                    selector += c;
                } else if (c == '[') {
                    endComponent();
                    state = ST_ATTR_IN;
                    selector += c;
                } else {
                    error();
                }
                break;
            case ST_PCLASS_IN:
                if (c == ')') {
                    state = ST_PCLASS;
                }
                selector += c;
                break;
            case ST_ATTR_IN:
                if (c == ']') {
                    state = ST_ATTR;
                }
                selector += c;
                break;
        }
    }

    endComponent();

    return components;
}

function createRuleTree(ruleList) {
    const ruleTree = {};
    for (const rule of ruleList) {
        for (const chain of rule.selectors) {
            let node = ruleTree;
            for (const item of chain) {
                node.items = node.items || {};
                node.items[item.selector] = node.items[item.selector] || {};
                node = node.items[item.selector];
            }
            node.properties = node.properties || [];
            Array.prototype.push.apply(node.properties, rule.properties);
        }
    }
    return ruleTree;
}

function printRuleTree(root, indentChar, indentSize, level = 0) {
    if (!root.items) {
        return '';
    }
    
    let result = '';
    indentChar = indentChar || ' ';
    indentSize = indentSize != null ? indentSize : (indentChar == ' ' ? 4 : 1);
    
    for (const [selector, node] of Object.entries(root.items)) {
        result +=
            (root.properties ? '\n' : '')
            + indent(level, indentChar, indentSize) 
            + selector + ' {\n';
        if (node.properties) {
            for (const p of node.properties) {
                result += indent(level + 1, indentChar, indentSize) + p.name + ': ' + p.value + ';\n';
            }
        }
        printRuleTree(node, indentChar, indentSize, level + 1);
        result += indent(level, indentChar, indentSize)  + '}' + (level == 0 ? '\n' : '') + '\n';
    }
    
    return result;
}

function indent(level, char, size) {
    let s = '';
    for (let i = 0; i < level; i++) {
        for (let j = 0; j < size; j++) {
            s += char;
        }
    }
    return s;
}

const inputFile = process.argv.length >= 3 ? process.argv[2] : process.stdin.fd;
const css = fs.readFileSync(inputFile, 'utf-8');
const rules = parseRules(css);

printRuleTree(createRuleTree(rules));

module.exports = {
    parseSelector,
    parseRules,
    createRuleTree,
    printRuleTree
};