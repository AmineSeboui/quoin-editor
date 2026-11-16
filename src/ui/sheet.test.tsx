import { render, screen } from '@testing-library/react';
import { Dialog } from './dialog';
import { SheetContent, SheetTitle } from './sheet';

const PHYSICAL = /(^|\s)\S*(left-|right-|border-[lr]\b|[mp][lr]-|slide-(in|out)-(from|to)-(left|right))/;

describe("shadcn's Sheet", () => {
  it('slides in from the side it is given, on the popover surface, with logical sides only', () => {
    render(
      <div dir="rtl">
        <Dialog open modal={false}>
          <SheetContent side="bottom" aria-describedby={undefined}>
            <SheetTitle>Comments</SheetTitle>
          </SheetContent>
        </Dialog>
      </div>,
    );
    const sheet = screen.getByRole('dialog', { name: 'Comments' });
    expect(sheet).toHaveAttribute('data-slot', 'sheet-content');
    expect(sheet).toHaveAttribute('data-side', 'bottom');
    expect(sheet).toHaveClass('bg-popover');
    expect(sheet.className).not.toMatch(PHYSICAL);
    expect(screen.getByText('Comments')).toHaveAttribute('data-slot', 'sheet-title');
  });
});
