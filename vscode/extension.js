'use strict';

const vscode = require('vscode');
const {parseRules, createRuleTree, printRuleTree} = require('../lib/css2sass');

function transformEditorSelection(transformer) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return; // No open text editor
    }

    editor.edit(editBuilder => {
        editor.selections.forEach(selection => {
            const text = editor.document.getText(new vscode.Range(selection.start, selection.end));
            editBuilder.replace(selection, transformer(text));
        });
    });
}

function convertToSCSS(text) {
	return printRuleTree(createRuleTree(parseRules(text)));
}

function activate(context) {
    context.subscriptions.push(
        vscode.commands.registerCommand('css2sass.convertToSCSS', () => {
            transformEditorSelection(convertToSCSS);
            vscode.window.showInformationMessage('Success!');
        })
    );
}

module.exports = {activate};