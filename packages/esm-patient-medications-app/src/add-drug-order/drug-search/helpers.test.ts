import { launchWorkspace2 } from '@openmrs/esm-framework';
import { closeAndShowOrderBasket } from './helpers';

const mockLaunchWorkspace2 = jest.mocked(launchWorkspace2);

describe('closeAndShowOrderBasket', () => {
  beforeEach(() => {
    mockLaunchWorkspace2.mockReset();
  });

  it('opens the order basket after closing the drug search', async () => {
    const closeWorkspace = jest.fn().mockResolvedValue(true);

    await closeAndShowOrderBasket(closeWorkspace);

    expect(closeWorkspace).toHaveBeenCalledTimes(1);
    expect(mockLaunchWorkspace2).toHaveBeenCalledWith('order-basket');
  });

  it('does not open the order basket when the drug search stays open', async () => {
    const closeWorkspace = jest.fn().mockResolvedValue(false);

    await closeAndShowOrderBasket(closeWorkspace);

    expect(mockLaunchWorkspace2).not.toHaveBeenCalled();
  });
});
