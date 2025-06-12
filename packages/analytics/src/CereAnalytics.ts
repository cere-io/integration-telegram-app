import { UriSigner } from '@cere-activity-sdk/events';
import { u8aToHex } from '@polkadot/util';
import { blake2bHex } from 'blakejs';
import { v4 as uuid } from 'uuid';

const signingProtocolVersion1 = 0x00;
const signingSignerApp = 0x02;
const signingAlgorithmEd25519 = 0x00;

export type User = {
  id: string;
  username?: string;
  email?: string;
};

export type Geo = {
  ip?: string;
  country_name?: string;
  country_code?: string;
  continent_code?: string;
  continent_name?: string;
};

export class CereAnalytics {
  private connectionId = uuid();
  private sessionId = uuid();

  private signer: UriSigner;

  private user: User | null = null;
  private geo: Geo | null = null;
  private tags: any | null = null;

  constructor(
    private baseUrl: string,
    private appId: string,
    appMnemonic: string,
    private dataServicePubKey: string,
  ) {
    this.signer = new UriSigner(appMnemonic, { type: 'ed25519' });
  }

  setUser(user: User) {
    this.user = user;
  }

  clearUser() {
    this.user = null;
  }

  setGeo(geo: Geo) {
    this.geo = geo;
  }

  setTags(tags: any) {
    this.tags = tags;
  }

  exception(name: string, payload?: any) {
    this.sendEvent('EXCEPTION', { name, ...payload }).then(() => {
      console.log(`Exception ${name} has been successfully sent to Cere Analytics`);
    });
  }
  transaction(name: string, duration: number, payload?: any) {
    this.sendEvent('TRANSACTION', { name, duration, ...payload }).then(() => {
      console.log(`Transaction ${name} (${duration} ms) has been successfully sent to Cere Analytics`);
    });
  }

  async sendEvent(type: string, payload: any) {
    await this.signer.isReady();

    const body: any = {
      app_id: this.appId,
      connection_id: this.connectionId,
      session_id: this.sessionId,
      app_pub_key: this.signer.publicKey,
      data_service_pub_key: this.dataServicePubKey,

      id: uuid(),
      event_type: type,
      timestamp: new Date().toISOString(),
      payload: {
        ...payload,
        tags: {
          ...this.tags,
        },
        user: this.user,
        geo: this.geo,
      },

      signing: u8aToHex(new Uint8Array([signingProtocolVersion1, signingSignerApp, signingAlgorithmEd25519])),
    };

    const message = blake2bHex([body.id, body.event_type, body.timestamp].join(''));
    body.signature = await this.signer.sign(['\x19Ethereum Signed Message:\n', message.length, message].join(''));

    await fetch(new URL('/event/events', this.baseUrl), {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
