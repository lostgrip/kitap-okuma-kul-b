import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Auth from './Auth';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

describe('Auth Component (Registration & Login)', () => {
  const mockSignUp = vi.fn();
  const mockSignIn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      signIn: mockSignIn,
      signUp: mockSignUp,
    } as any);
  });

  const renderComponent = () => render(
    <MemoryRouter>
      <Auth />
    </MemoryRouter>
  );

  it('renders login tab by default', () => {
    renderComponent();
    expect(screen.getByRole('tab', { name: /giriş yap/i })).toHaveAttribute('data-state', 'active');
  });

  describe('Registration Flow', () => {
    
    const setupSignupTab = async () => {
      renderComponent();
      const user = userEvent.setup();
      await user.click(screen.getByRole('tab', { name: /kayıt ol/i }));
      
      // Wait for the signup form to be fully visible by finding its submit button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /kayıt ol/i })).toBeInTheDocument();
      });
      return user;
    };

    it('shows error if fields are empty', async () => {
      const user = await setupSignupTab();
      await user.click(screen.getByRole('button', { name: /kayıt ol/i }));
      
      expect(toast.error).toHaveBeenCalledWith('Lütfen tüm alanları doldurun');
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('shows error if password is too short', async () => {
      const user = await setupSignupTab();
      await user.type(screen.getByLabelText(/kullanıcı adı/i), 'testuser');
      await user.type(screen.getByLabelText(/görünen ad/i), 'Test User');
      // Fix specific input selection by finding it through placeholder if label is ambiguous or hidden
      await user.type(screen.getByPlaceholderText('email@example.com'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('En az 6 karakter'), '123');

      await user.click(screen.getByRole('button', { name: /kayıt ol/i }));
      expect(toast.error).toHaveBeenCalledWith('Şifre en az 6 karakter olmalı');
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('successfully calls signUp with correct data', async () => {
      const user = await setupSignupTab();
      mockSignUp.mockResolvedValueOnce({ error: null });

      await user.type(screen.getByLabelText(/kullanıcı adı/i), 'testuser');
      await user.type(screen.getByLabelText(/görünen ad/i), 'Test User');
      await user.type(screen.getByPlaceholderText('email@example.com'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('En az 6 karakter'), 'securepwd');

      await user.click(screen.getByRole('button', { name: /kayıt ol/i }));

      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'securepwd', 'testuser', 'Test User');
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Hesabınız oluşturuldu! Giriş yapabilirsiniz.');
      });
    });

    it('handles signUp API error correctly', async () => {
      const user = await setupSignupTab();
      mockSignUp.mockResolvedValueOnce({ error: { message: 'Email already exists' } });

      await user.type(screen.getByLabelText(/kullanıcı adı/i), 'testuser');
      await user.type(screen.getByLabelText(/görünen ad/i), 'Test User');
      await user.type(screen.getByPlaceholderText('email@example.com'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('En az 6 karakter'), 'securepwd');

      await user.click(screen.getByRole('button', { name: /kayıt ol/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Kayıt başarısız: Email already exists');
      });
    });
  });
});
