import React from 'react';
import renderer from 'react-test-renderer';
import StatusBanner from '../StatusBanner';

// Mock apiClient
jest.mock('../../api/client', () => ({
    get: jest.fn(() => Promise.resolve({ data: { message: 'Online' } })),
}));

describe('<StatusBanner />', () => {
    it('renders correctly', () => {
        const tree = renderer.create(<StatusBanner />).toJSON();
        expect(tree).toMatchSnapshot();
    });
});
