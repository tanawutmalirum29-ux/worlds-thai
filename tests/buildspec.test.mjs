import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseDocument } from 'yaml';

test('Amplify Gen 2 build specification parses to the expected schema', () => {
  const yaml = readFileSync(new URL('../amplify.yml', import.meta.url), 'utf8');
  const doc = parseDocument(yaml, { uniqueKeys: true, strict: true });
  assert.equal(doc.errors.length, 0, doc.errors.map(error => error.message).join('\n'));
  const config = doc.toJS();
  assert.equal(config.version, 1);
  for (const [phase, commands] of [
    ['backend.preBuild', config.backend?.phases?.preBuild?.commands],
    ['backend.build', config.backend?.phases?.build?.commands],
    ['frontend.build', config.frontend?.phases?.build?.commands],
  ]) {
    assert.ok(Array.isArray(commands) && commands.length > 0, phase + ' commands missing');
    commands.forEach((command, index) => {
      assert.equal(typeof command, 'string',
        phase + ' command ' + index + ' is not a scalar string; quote YAML reserved characters');
      assert.ok(command.trim().length > 0);
    });
  }
  assert.ok(config.backend.phases.build.commands.some(cmd => cmd.includes('ampx pipeline-deploy')));
  assert.ok(config.frontend.phases.build.commands.some(cmd => cmd.includes('amplify_outputs.json')));
  assert.equal(config.frontend.artifacts.baseDirectory, 'dist');
});

test('regression: an unquoted YAML colon creates a mapping, not a command string', () => {
  const broken = parseDocument('commands:\n  - echo "ERROR: missing file"\n').toJS();
  assert.equal(typeof broken.commands[0], 'object');
});
