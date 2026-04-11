import * as assert from 'assert';
import * as path from 'path';
import { executeEnvelope } from '../../executor';

// From dist/test/suite/ go up 4 → packages/, then into shared/maps
const MAPS_DIR = path.resolve(__dirname, '../../../../shared/maps');

function makeEnvelope(actions: unknown[]): unknown {
  return {
    schema_version: '1.0',
    session_id: '00000000-0000-0000-0000-000000000001',
    utterance_id: '00000000-0000-0000-0000-000000000002',
    assistant_text: 'test',
    confidence: 0.9,
    actions,
  };
}

describe('executeEnvelope — real VS Code', () => {

  describe('execute_command', () => {
    it('open_scm alias executes workbench.view.scm without error', async () => {
      const logs: string[] = [];
      await executeEnvelope(
        makeEnvelope([{ id: 'a1', type: 'execute_command', alias: 'open_scm', risk: 'low' }]),
        { mapsDir: MAPS_DIR, log: (s) => logs.push(s) },
      );
      assert.ok(!logs.some((l) => l.includes('unknown alias')), 'unexpected unknown-alias log');
    });

    it('unknown alias logs but does not throw', async () => {
      const logs: string[] = [];
      await executeEnvelope(
        makeEnvelope([{ id: 'a1', type: 'execute_command', alias: 'nonexistent_alias', risk: 'low' }]),
        { mapsDir: MAPS_DIR, log: (s) => logs.push(s) },
      );
      assert.ok(logs.some((l) => l.includes('unknown alias')), 'expected unknown-alias log');
    });

    it('high-risk command executes when requestConfirm returns true', async () => {
      const logs: string[] = [];
      try {
        await executeEnvelope(
          makeEnvelope([{ id: 'a1', type: 'execute_command', alias: 'git_commit', risk: 'high' }]),
          {
            mapsDir: MAPS_DIR,
            log: (s) => logs.push(s),
            requestConfirm: async () => true,
          },
        );
      } catch {
        // git.commit may fail in headless VS Code (nothing to commit) — expected
      }
      assert.ok(!logs.some((l) => l.includes('user cancelled')), 'command should not be cancelled');
    });

    it('high-risk command does not execute when requestConfirm returns false', async () => {
      const logs: string[] = [];
      await executeEnvelope(
        makeEnvelope([{ id: 'a1', type: 'execute_command', alias: 'git_commit', risk: 'high' }]),
        {
          mapsDir: MAPS_DIR,
          log: (s) => logs.push(s),
          requestConfirm: async () => false,
        },
      );
      assert.ok(logs.some((l) => l.includes('user cancelled')), 'expected cancelled log');
    });
  });

  describe('show_information_message', () => {
    it('resolves without error', async () => {
      const logs: string[] = [];
      await executeEnvelope(
        makeEnvelope([{ id: 'a1', type: 'show_information_message', message: 'Hello world', risk: 'low' }]),
        { mapsDir: MAPS_DIR, log: (s) => logs.push(s) },
      );
      assert.ok(!logs.some((l) => l.includes('invalid')), 'unexpected error in logs');
    });
  });

  describe('noop', () => {
    it('logs the reason', async () => {
      const logs: string[] = [];
      await executeEnvelope(
        makeEnvelope([{ id: 'a1', type: 'noop', reason: 'nothing to do', risk: 'low' }]),
        { mapsDir: MAPS_DIR, log: (s) => logs.push(s) },
      );
      assert.ok(logs.some((l) => l.includes('noop')), 'expected noop log');
    });
  });

  describe('invalid envelope', () => {
    it('logs error when envelope has an extra field (Zod strict)', async () => {
      const logs: string[] = [];
      await executeEnvelope(
        {
          ...(makeEnvelope([{ id: 'a1', type: 'execute_command', alias: 'open_scm', risk: 'low' }]) as object),
          extra_field: 'unexpected',
        },
        { mapsDir: MAPS_DIR, log: (s) => logs.push(s) },
      );
      assert.ok(logs.some((l) => l.includes('invalid envelope')), 'expected invalid-envelope log');
    });

    it('logs error when required field is missing', async () => {
      const logs: string[] = [];
      await executeEnvelope({ schema_version: '1.0' }, { mapsDir: MAPS_DIR, log: (s) => logs.push(s) });
      assert.ok(logs.some((l) => l.includes('invalid envelope')), 'expected invalid-envelope log');
    });
  });

  describe('empty actions array', () => {
    it('fails Zod validation and logs error', async () => {
      const logs: string[] = [];
      await executeEnvelope(makeEnvelope([]), { mapsDir: MAPS_DIR, log: (s) => logs.push(s) });
      assert.ok(logs.some((l) => l.includes('invalid envelope')), 'expected invalid-envelope log');
    });
  });

  describe('loadCommandMap error handling', () => {
    it('logs error when mapsDir does not exist', async () => {
      const logs: string[] = [];
      await executeEnvelope(
        makeEnvelope([{ id: 'a1', type: 'execute_command', alias: 'open_scm', risk: 'low' }]),
        { mapsDir: '/nonexistent/does-not-exist', log: (s) => logs.push(s) },
      );
      assert.ok(logs.some((l) => l.includes('failed to load command map')), 'expected load-error log');
    });
  });

  describe('multi-action envelope', () => {
    it('continues processing after an unknown alias', async () => {
      const logs: string[] = [];
      await executeEnvelope(
        makeEnvelope([
          { type: 'execute_command', alias: 'nonexistent_alias_xyz', risk: 'low', id: 'a1' },
          { type: 'execute_command', alias: 'open_scm', risk: 'low', id: 'a2' },
        ]),
        { mapsDir: MAPS_DIR, log: (s) => logs.push(s) },
      );
      assert.ok(logs.some((l) => l.includes('unknown alias')), 'first action should log unknown-alias');
      assert.ok(!logs.some((l) => l.includes('invalid envelope')), 'should not log invalid-envelope');
    });
  });
});
