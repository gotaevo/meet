import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { NoiseFilterControl } from './NoiseFilterControl';

describe('NoiseFilterControl', () => {
  it('starts off and lets the participant enable and disable the filter', () => {
    const toggle = vi.fn();
    const off = NoiseFilterControl({
      enabled: false,
      pending: false,
      supported: true,
      onToggle: toggle,
    });
    expect(off.props['aria-pressed']).toBe(false);
    expect(off.props['aria-label']).toContain('Ativar');
    off.props.onClick();
    expect(toggle).toHaveBeenLastCalledWith(true);
    const on = NoiseFilterControl({
      enabled: true,
      pending: false,
      supported: true,
      onToggle: toggle,
    });
    on.props.onClick();
    expect(toggle).toHaveBeenLastCalledWith(false);
  });

  it('disables the control while applying or on unsupported browsers', () => {
    const props = { enabled: false, onToggle: vi.fn() };
    expect(NoiseFilterControl({ ...props, pending: true, supported: true }).props.disabled).toBe(
      true,
    );
    expect(NoiseFilterControl({ ...props, pending: false, supported: false }).props.disabled).toBe(
      true,
    );
  });
});
