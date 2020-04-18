#!/usr/bin/env node

const fs = require('fs');

function parseCSSSelector(selector) {
    return selector;
}

function parseCSSRules(css) {
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
    let selectorStack = [];
    let properties = [];
    const rules = [];
    
    function error() {
        console.log('selector', selector);
        console.log('properties', properties);
        throw new Error(`Unexpected character '${c}' at line ${lineNum}, column ${colNum}`);
    }

    function beginProperty() {
        property = '';
        value = '';
    }

    function endSelector() {
        selectorStack.push(parseCSSSelector(selector.trim()));
    }

    function endSelectors() {
        selectors.push(selectorStack);
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
        selectorStack = [];
        beginRuleProperties();
    }

    function endRule() {
        rules.push({selectors, properties});
        beginRule();
    }

    beginRule();

    for (let i = 0; i < css.length; i++) {
        c = css[i];
        console.log(i, state);
        console.log('c: "' + c + '"`');
        
        switch (state) {
            case ST_TOP:
                if (RE_WHITESPACE.test(c)) {
                    // ignore
                } else if (RE_SELECTOR.test(c)) {
                    selector = c;
                    state = ST_SEL;
                } else if (c == '{') {
                    state = ST_SEL_IN;
                    endSelectors();
                    beginRuleProperties();
                } else {
                    error();
                }
                break;
            case ST_SEL:
                if (RE_SELECTOR.test(c)) {
                    selector += c;
                } else if (RE_WHITESPACE.test(c)) {
                    state = ST_TOP;
                    endSelector();
                } else if (c == ',') {
                    state = ST_SEL_COMMA;
                    endSelector();
                } else if (c == '{') {
                    state = ST_SEL_IN;
                    endSelector();
                    endSelectors();
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
                    state = ST_SEL_TOP;
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

if (process.argv.length <= 2) {
    console.error('Usage: css2sass <css_file_path>');
    process.exit();
}

const css = fs.readFileSync(process.argv[2], 'utf-8');
const rules = parseCSSRules(css);

console.log(JSON.stringify(rules, null, 4));