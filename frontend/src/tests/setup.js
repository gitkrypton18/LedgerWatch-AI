// frontend/src/tests/setup.js
// Vitest + jest-dom setup for LedgerWatch AI tests

import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';

expect.extend(matchers);

afterEach(() => {
    cleanup();
});
