import { hostKey } from '../../view';
import { cleanUpAfterTest, mountController } from '../../view/controller/test-controller';
import { rangeRect } from './range-rect';

const TEXT_BOX = new DOMRect(10, 20, 30, 16);
const range = (from: number, to: number) => ({ block: 'a', region: 'text', from, to });
const rangePrototype = Range.prototype as unknown as Record<string, unknown>;

function shortenText(host: HTMLElement): void {
  (host.firstChild as Text).data = '\u65e5\u672c';
}

beforeEach(() => {
  rangePrototype.getBoundingClientRect = () => TEXT_BOX;
});

afterEach(() => {
  delete rangePrototype.getBoundingClientRect;
  cleanUpAfterTest();
});

describe('rangeRect', () => {
  it('measures the range of text in its host', () => {
    const { controller } = mountController('First paragraph.');
    expect(rangeRect(controller, range(6, 15))).toEqual(TEXT_BOX);
  });

  it('measures nothing in a host a composition is changing, so an anchor keeps its last box', () => {
    const { controller, host } = mountController('First paragraph.');
    controller.composingKey = hostKey('a', 'text');
    shortenText(host);
    expect(rangeRect(controller, range(0, 16))).toBeNull();
  });

  it('keeps to the text the host holds when its offsets run past it', () => {
    const { controller, host } = mountController('First paragraph.');
    shortenText(host);
    expect(rangeRect(controller, range(0, 16))).toEqual(TEXT_BOX);
  });
});
