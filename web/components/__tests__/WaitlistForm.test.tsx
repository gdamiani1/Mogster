import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getSupabase } from '@/lib/supabase';
import { WaitlistForm } from '../WaitlistForm';

vi.mock('@/lib/supabase', () => ({
  getSupabase: vi.fn(),
}));

type InsertArgs = { email: string; user_agent: string };
type InsertResult = { error: unknown };

function setInsertResolving(result: InsertResult) {
  const insert = vi.fn((_: InsertArgs) => Promise.resolve(result));
  const from = vi.fn(() => ({ insert }));
  vi.mocked(getSupabase).mockImplementation(() => ({ from }) as never);
  return insert;
}

function setInsertRejecting(err: unknown) {
  const insert = vi.fn((_: InsertArgs) => Promise.reject(err));
  const from = vi.fn(() => ({ insert }));
  vi.mocked(getSupabase).mockImplementation(() => ({ from }) as never);
  return insert;
}

function setInsertPending() {
  let resolveInsert: (v: InsertResult) => void = () => {};
  const insert = vi.fn(
    (_: InsertArgs) =>
      new Promise<InsertResult>((r) => {
        resolveInsert = r;
      }),
  );
  const from = vi.fn(() => ({ insert }));
  vi.mocked(getSupabase).mockImplementation(() => ({ from }) as never);
  return { insert, resolve: (v: InsertResult) => resolveInsert(v) };
}

beforeEach(() => {
  vi.mocked(getSupabase).mockReset();
  // Default: inserts succeed with no error.
  setInsertResolving({ error: null });
});

describe('WaitlistForm — validation', () => {
  it('shows an error when submitting an invalid email', async () => {
    const user = userEvent.setup();
    render(<WaitlistForm />);

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /lock me in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/valid email/i);
  });

  it('shows an error when consent is not checked', async () => {
    const user = userEvent.setup();
    render(<WaitlistForm />);

    await user.type(screen.getByLabelText(/email/i), 'sigma@mogster.app');
    await user.click(screen.getByRole('button', { name: /lock me in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/consent/i);
  });

  it('does not call Supabase when validation fails', async () => {
    const user = userEvent.setup();
    const insert = setInsertResolving({ error: null });
    render(<WaitlistForm />);

    await user.type(screen.getByLabelText(/email/i), 'nope');
    await user.click(screen.getByRole('button', { name: /lock me in/i }));

    expect(insert).not.toHaveBeenCalled();
  });
});

describe('WaitlistForm — successful submission', () => {
  it('inserts email into Supabase and shows success state on submit', async () => {
    const user = userEvent.setup();
    setInsertResolving({ error: null });
    render(<WaitlistForm />);

    await user.type(screen.getByLabelText(/email/i), 'sigma@mogster.app');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /lock me in/i }));

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(/locked in/i);
    expect(
      screen.queryByRole('button', { name: /lock me in/i }),
    ).not.toBeInTheDocument();
  });

  it('calls insert with email + user_agent', async () => {
    const user = userEvent.setup();
    const insert = setInsertResolving({ error: null });
    render(<WaitlistForm />);

    await user.type(screen.getByLabelText(/email/i), 'sigma@mogster.app');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /lock me in/i }));

    await screen.findByRole('status');
    expect(insert).toHaveBeenCalledTimes(1);
    const args = insert.mock.calls[0][0];
    expect(args).toMatchObject({ email: 'sigma@mogster.app' });
    expect(typeof args.user_agent).toBe('string');
  });

  it('disables submit while sending', async () => {
    const user = userEvent.setup();
    const { insert, resolve } = setInsertPending();

    render(<WaitlistForm />);
    await user.type(screen.getByLabelText(/email/i), 'sigma@mogster.app');
    await user.click(screen.getByRole('checkbox'));
    const button = screen.getByRole('button', { name: /lock me in/i });
    await user.click(button);

    expect(insert).toHaveBeenCalled();
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    resolve({ error: null });
    await screen.findByRole('status');
  });
});

describe('WaitlistForm — error handling', () => {
  it('shows "already on the list" when Supabase returns 23505', async () => {
    const user = userEvent.setup();
    setInsertResolving({
      error: { code: '23505', message: 'duplicate key value' },
    });
    render(<WaitlistForm />);

    await user.type(screen.getByLabelText(/email/i), 'sigma@mogster.app');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /lock me in/i }));

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(/already on the list/i);
    expect(status).toHaveAttribute('data-phase', 'duplicate');
    expect(
      screen.queryByRole('button', { name: /lock me in/i }),
    ).not.toBeInTheDocument();
  });

  it('shows a retry message on network error', async () => {
    const user = userEvent.setup();
    setInsertRejecting(new Error('network down'));
    render(<WaitlistForm />);

    await user.type(screen.getByLabelText(/email/i), 'sigma@mogster.app');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /lock me in/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/try again/i);
    const button = screen.getByRole('button', { name: /lock me in/i });
    expect(button).toBeEnabled();
  });

  it('does not crash on non-23505 database errors', async () => {
    const user = userEvent.setup();
    setInsertResolving({
      error: { code: '42501', message: 'permission denied' },
    });
    render(<WaitlistForm />);

    await user.type(screen.getByLabelText(/email/i), 'sigma@mogster.app');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /lock me in/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/try again/i);
    const button = screen.getByRole('button', { name: /lock me in/i });
    expect(button).toBeEnabled();
  });
});
