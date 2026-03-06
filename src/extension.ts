import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // Register command to collapse all sections
  const collapseAllDisposable = vscode.commands.registerCommand(
    'markdown-outliner.collapseAll',
    () => {
      vscode.commands.executeCommand('markdown.preview.refresh');
      // Send message to all markdown preview webviews
      vscode.commands.executeCommand(
        'markdown.api.render',
        { collapseAll: true }
      );
    }
  );

  // Register command to expand all sections
  const expandAllDisposable = vscode.commands.registerCommand(
    'markdown-outliner.expandAll',
    () => {
      vscode.commands.executeCommand('markdown.preview.refresh');
      vscode.commands.executeCommand(
        'markdown.api.render',
        { expandAll: true }
      );
    }
  );

  context.subscriptions.push(collapseAllDisposable, expandAllDisposable);
}

export function deactivate() {}
