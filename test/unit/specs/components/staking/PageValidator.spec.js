import { shallowMount, createLocalVue } from "@vue/test-utils"
import PageValidator from "renderer/components/staking/PageValidator"
import BigNumber from "bignumber.js"

const stakingParameters = {
  unbonding_time: `259200000000000`,
  max_validators: 100,
  bond_denom: `STAKE`
}

const validator = {
  operator_address: `cosmosvaladdr15ky9du8a2wlstz6fpx3p4mqpjyrm5ctqzh8yqw`,
  pub_key: `cosmosvalpub1234`,
  revoked: false,
  tokens: `14`,
  delegator_shares: `14`,
  description: {
    website: `www.monty.ca`,
    details: `Mr Mounty`,
    moniker: `mr_mounty`,
    country: `Canada`
  },
  status: 2,
  bond_height: `0`,
  bond_intra_tx_counter: 6,
  proposer_reward_pool: null,
  commission: {
    rate: `0.05`,
    max_rate: `0.1`,
    max_change_rate: `0.005`,
    update_time: Date.now() - 1
  },
  prev_bonded_shares: `0`,
  voting_power: `10`,
  selfBond: 0.01,
  signing_info: {
    missed_blocks_counter: 2
  }
}
const validatorTo = {
  operator_address: `cosmosvaladdr15ky9du8a2wlstz6fpx3p4mqpjyrm5ctplpn3au`,
  description: {
    moniker: `good_greg`
  }
}

const getters = {
  session: { experimentalMode: true, signedIn: true, address: `cosmos15ky9du8a2wlstz6fpx3p4mqpjyrm5ctpesxxn9` },
  delegates: {
    delegates: [validator, validatorTo],
    globalPower: 4200,
    loaded: true
  },

  committedDelegations: {
    [validator.operator_address]: 0
  },
  lastHeader: {
    height: `500`
  },
  distribution: {
    rewards: {
      [validator.operator_address]: 10
    }
  },
  keybase: `keybase`,
  liquidAtoms: 1337,
  connected: true,
  bondDenom: stakingParameters.bond_denom
}

describe(`PageValidator`, () => {
  let wrapper, $store
  const localVue = createLocalVue()
  localVue.directive(`tooltip`, () => { })

  beforeEach(() => {
    $store = {
      commit: jest.fn(),
      dispatch: jest.fn(),
      getters: JSON.parse(JSON.stringify(getters)) // clone to be safe we don't overwrite
    }
    wrapper = shallowMount(PageValidator, {
      localVue,
      mocks: {
        $store,
        $route: {
          params: { validator: validator.operator_address }
        }
      }
    })
  })

  describe(`shows a validator profile information`, () => {
    it(`if user has signed in`, () => {
      expect(wrapper.vm.$el).toMatchSnapshot()
    })

    it(`if user hasn't signed in`, () => {
      $store.getters.session.signedIn = false

      expect(wrapper.vm.$el).toMatchSnapshot()
    })

    it(`should return one delegate based on route params`, () => {
      expect(wrapper.vm.validator.operator_address).toEqual(
        validator.operator_address
      )
    })

    it(`shows a default avatar`, () => {
      expect(wrapper.find(`.page-profile__header`).html()).toContain(`validator-icon.svg`)
    })

    it(`should return the self bond based on the validator`, () => {
      const validator = {
        selfBond: 1
      }
      wrapper.setData({ validator })
      expect(wrapper.vm.selfBond).toBe(`100.00%`)

      validator.selfBond = undefined
      wrapper.setData({ validator })
      expect(wrapper.vm.selfBond).toBe(`0.00%`)
    })

    it(`shows an error if the validator couldn't be found`, () => {
      $store.getters.delegates.delegates = []

      expect(wrapper.exists(`tm-data-error-stub`)).toBe(true)
    })

    it(`shows the selfBond`, () => {
      expect(wrapper.find(`#page-profile__self-bond`).text()).toBe(`1.00%`)
    })

    it(`should show the validator status`, () => {
      expect(wrapper.vm.status).toBe(`This validator is actively validating`)
      // Jailed
      $store.getters.delegates.delegates = [Object.assign({}, validator, {
        revoked: true
      })]
      expect(wrapper.vm.status).toBe(
        `This validator has been jailed and is not currently validating`
      )
      // Is not a validator
      $store.getters.delegates.delegates = [Object.assign({}, validator, {
        voting_power: 0
      })]
      expect(wrapper.vm.status).toBe(
        `This validator does not have enough voting power yet and is inactive`
      )
    })

    it(`shows a validator as candidate if he has no voting_power`, () => {
      $store.getters.delegates.delegates = [Object.assign({}, validator, {
        voting_power: 0
      })]
      expect(wrapper.vm.status).toMatchSnapshot()
    })

    it(`shows that a validator is revoked`, () => {
      $store.getters.delegates.delegates = [Object.assign({}, validator, {
        revoked: true
      })]
      expect(wrapper.vm.status).toMatchSnapshot()
    })

    it(`disables delegation and undelegation buttons if not connected`, () => {
      expect(
        wrapper.vm.$el.querySelector(`#delegation-btn`).getAttribute(`disabled`)
      ).toBeNull()
      expect(
        wrapper.vm.$el.querySelector(`#undelegation-btn`).getAttribute(`disabled`)
      ).toBeNull()
      $store.getters.connected = false
      expect(
        wrapper.vm.$el.querySelector(`#delegation-btn`).getAttribute(`disabled`)
      ).not.toBeNull()
      expect(
        wrapper.vm.$el.querySelector(`#undelegation-btn`).getAttribute(`disabled`)
      ).not.toBeNull()
    })

    describe(`errors`, () => {
      it(`signing info is missing`, () => {
        $store.getters.delegates.delegates = [Object.assign({}, validator, {
          signing_info: undefined
        })]
        // still shows the validator without crashing
        expect(wrapper.vm.$el).toMatchSnapshot()
      })
    })
  })

  describe(`myDelegation`, () => {
    it(`when user has delegations`, () => {
      const bondDenom = `stake`
      const myBond = 10
      const delegationString = PageValidator.computed.myDelegation.call(
        { bondDenom, myBond }
      )
      expect(delegationString).toBe(`10.000000 stake`)
    })

    it(`when user doesn't have any delegations`, () => {
      const bondDenom = `stake`
      const myBond = 0
      const delegationString = PageValidator.computed.myDelegation.call(
        { bondDenom, myBond }
      )
      expect(delegationString).toBe(`--`)
    })
  })

  describe(`rewards`, () => {
    let bondDenom, validator, session, lastHeader

    beforeEach(() => {
      bondDenom = `stake`
      validator = { operator_address: `cosmos1address` }
      session = { signedIn: true }
      lastHeader = { height: `20` }
    })
    it(`gets rewards from validator if it has some`, () => {
      const distribution = {
        rewards: {
          [validator.operator_address]: {
            [bondDenom]: 100000000
          }
        }
      }
      const rewardsString = PageValidator.computed.rewards.call(
        { session, bondDenom, distribution, validator, lastHeader }
      )
      expect(rewardsString).toBe(`100.000000 stake`)
    })

    it(`when validator rewards are 0`, () => {
      const distribution = {
        rewards: {
          [validator.operator_address]: {
            [bondDenom]: 0
          }
        }
      }

      const rewardsString = PageValidator.computed.rewards.call(
        { session, bondDenom, distribution, validator, lastHeader }
      )
      expect(rewardsString).toBe(`0.000000 stake`)
    })

    it(`when user doesn't have any delegations`, () => {
      const distribution = { rewards: {} }
      const rewardsString = PageValidator.computed.rewards.call(
        { session, bondDenom, distribution, validator, lastHeader }
      )
      expect(rewardsString).toBeNull()
    })
  })

  it(`should call user rewards on mount`, () => {
    const session = { signedIn: true }
    const $store = { dispatch: jest.fn() }
    const myDelegation = 1
    const $route = { params: { validator: `cosmos1address` } }
    PageValidator.mounted.call({ session, $store, $route, myDelegation })
    expect($store.dispatch).toHaveBeenCalledWith(
      `getRewardsFromValidator`,
      $route.params.validator
    )
  })

  it(`shouldn't call user rewards if not signed in`, () => {
    const session = { signedIn: false }
    const $store = { dispatch: jest.fn() }
    const $route = { params: { validator: `cosmos1address` } }
    PageValidator.mounted.call({ session, $store, $route })
    expect($store.dispatch).not.toHaveBeenCalledWith(
      `getRewardsFromValidator`,
      $route.params.validator
    )
  })

  it(`shouldn't call user rewards there're no delegations`, () => {
    const session = { signedIn: true }
    const $store = { dispatch: jest.fn() }
    const myDelegation = `--`
    const $route = { params: { validator: `cosmos1address` } }
    PageValidator.mounted.call({ session, $store, $route, myDelegation })
    expect($store.dispatch).not.toHaveBeenCalledWith(
      `getRewardsFromValidator`,
      $route.params.validator
    )
  })

  describe(`update rewards on new blocks`, () => {
    describe(`shouldn't update`, () => {
      it(`if user is not signed in `, () => {
        const $store = { dispatch: jest.fn() }
        const session = { signedIn: false }
        const $route = {
          params: { validator: `cosmos1address` },
          name: `validator`
        }
        const myDelegation = `1 atom`
        const newHeader = { height: `20` }
        PageValidator.watch.lastHeader.handler.call(
          { session, $store, $route, myDelegation },
          newHeader)
        expect($store.dispatch).not.toHaveBeenCalledWith(
          `getRewardsFromValidator`,
          $route.params.validator
        )
      })

      it(`if hasn't waited for 20 blocks `, () => {
        const $store = { dispatch: jest.fn() }
        const session = { signedIn: true }
        const $route = {
          params: { validator: `cosmos1address` },
          name: `validator`
        }
        const myDelegation = `1 atom`
        const newHeader = { height: `30` }
        PageValidator.watch.lastHeader.handler.call(
          { session, $store, $route, myDelegation },
          newHeader)
        expect($store.dispatch).not.toHaveBeenCalledWith(
          `getRewardsFromValidator`,
          $route.params.validator
        )
      })

      it(`if user is not watching page validator`, () => {
        const $store = { dispatch: jest.fn() }
        const session = { signedIn: true }
        const $route = {
          params: { validator: `cosmos1address` },
          name: `my-delegations`
        }
        const myDelegation = `1 atom`
        const newHeader = { height: `20` }
        PageValidator.watch.lastHeader.handler.call(
          { session, $store, $route, myDelegation },
          newHeader)
        expect($store.dispatch).not.toHaveBeenCalledWith(
          `getRewardsFromValidator`,
          $route.params.validator
        )
      })

      it(`if user doesn't have any delegations `, () => {
        const $store = { dispatch: jest.fn() }
        const session = { signedIn: true }
        const $route = {
          params: { validator: `cosmos1address` },
          name: `validator`
        }
        const myDelegation = `--`
        const newHeader = { height: `30` }
        PageValidator.watch.lastHeader.handler.call(
          { session, $store, $route, myDelegation },
          newHeader)
        expect($store.dispatch).not.toHaveBeenCalledWith(
          `getRewardsFromValidator`,
          $route.params.validator
        )
      })
    })

    describe(`should update rewards `, () => {
      it(
        `if waited for 20 blocks, ` +
        `user has signed in, ` +
        `has delegations and is watching the validator page`,
        () => {
          const $store = { dispatch: jest.fn() }
          const session = { signedIn: true }
          const $route = {
            params: { validator: `cosmos1address` },
            name: `validator`
          }
          const myDelegation = `1 atom`
          const newHeader = { height: `20` }
          PageValidator.watch.lastHeader.handler.call(
            { session, $store, $route, myDelegation },
            newHeader)
          expect($store.dispatch).toHaveBeenCalledWith(
            `getRewardsFromValidator`,
            $route.params.validator
          )
        })
    })
  })
})

describe(`delegationTargetOptions`, () => {
  it(`always shows wallet in the first position`, () => {
    const $store = {
      commit: jest.fn(),
      dispatch: jest.fn()
    }

    const options = PageValidator.methods.delegationTargetOptions.call({
      ...getters,
      committedDelegations: {},
      $store,
      $route: {
        params: { validator: validator.operator_address }
      }
    })
    expect(options).toHaveLength(1)
    expect(options[0].address).toEqual(getters.session.address)

    expect(options).toMatchSnapshot()
  })

  it(`hides displayed validator if bonded`, () => {
    const $store = {
      commit: jest.fn(),
      dispatch: jest.fn()
    }

    const options = PageValidator.methods.delegationTargetOptions({
      ...getters,
      committedDelegations: {
        [validator.operator_address]: 10
      },
      $store,
      $route: {
        params: { validator: validator.operator_address }
      }
    })
    expect(options).toHaveLength(1)
    expect(options).not.toContainEqual(
      expect.objectContaining({ address: validator.operator_address })
    )
    expect(options[0].address).toEqual(getters.session.address)

    expect(options).toMatchSnapshot()
  })

  it(`shows bonded validators for redelegation options`, () => {
    const $store = {
      commit: jest.fn(),
      dispatch: jest.fn()
    }

    const options = PageValidator.methods.delegationTargetOptions.call({
      ...getters,
      committedDelegations: {
        [validator.operator_address]: 10,
        cosmosvaladdr15ky9du8a2wlstz6fpx3p4mqpjyrm5ctplpn3au: 5
      },
      $store,
      $route: {
        params: { validator: validator.operator_address }
      }
    })

    expect(options).toHaveLength(2)
    expect(options).not.toContainEqual(
      expect.objectContaining({ address: validator.operator_address })
    )
    expect(options[0].address).toEqual(getters.session.address)
    expect(options).toContainEqual(
      expect.objectContaining({ address: validatorTo.operator_address })
    )

    expect(options).toMatchSnapshot()
  })

  describe(`Staking functions`, () => {
    describe(`onDelegation`, () => {
      it(`should open delegation modal`, () => {
        const self = {
          action: ``,
          liquidAtoms: 42,
          $refs: {
            delegationModal: {
              open: jest.fn()
            }
          },
          showCannotModal: false
        }
        PageValidator.methods.onDelegation.call(self)
        expect(self.$refs.delegationModal.open).toHaveBeenCalled()
      })
    })

    describe(`onUndelegation`, () => {
      it(`should open undelegation modal`, () => {
        const self = {
          action: ``,
          myBond: BigNumber(42),
          $refs: {
            undelegationModal: {
              open: jest.fn()
            }
          },
          showCannotModal: false
        }
        PageValidator.methods.onUndelegation.call(self)
        expect(self.$refs.undelegationModal.open).toHaveBeenCalled()
      })
    })
  })
})