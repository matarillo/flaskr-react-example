import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import Login from './Login'

describe('Login Component', () => {
  it('失敗', async () => {
    render(<Login></Login>);
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });
})