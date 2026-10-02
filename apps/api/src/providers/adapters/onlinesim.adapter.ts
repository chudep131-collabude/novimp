import { Injectable } from '@nestjs/common';
import {
  ProviderAdapter,
  ProviderService,
  ProviderOrderRequest,
  ProviderOrderResponse,
  ProviderOrderStatus,
} from '../interfaces/provider-adapter.interface';
import { LoggerService } from '@/common/logger/logger.service';

/**
 * Dial code (numeric) → ISO 3166-1 alpha-2 code mapping.
 * OnlineSIM uses numeric dial codes (e.g. 44 = UK, 49 = Germany).
 * Our CountryFlag component and the frontend need ISO 2-letter codes.
 */
const DIAL_TO_ISO: Record<number, string> = {
  1: 'US', 7: 'RU', 20: 'EG', 27: 'ZA', 30: 'GR', 31: 'NL', 32: 'BE',
  33: 'FR', 34: 'ES', 36: 'HU', 39: 'IT', 40: 'RO', 41: 'CH', 43: 'AT',
  44: 'GB', 45: 'DK', 46: 'SE', 47: 'NO', 48: 'PL', 49: 'DE', 51: 'PE',
  52: 'MX', 53: 'CU', 54: 'AR', 55: 'BR', 56: 'CL', 57: 'CO', 58: 'VE',
  60: 'MY', 61: 'AU', 62: 'ID', 63: 'PH', 64: 'NZ', 65: 'SG', 66: 'TH',
  77: 'KZ', 81: 'JP', 82: 'KR', 84: 'VN', 85: 'HK', 86: 'CN', 90: 'TR',
  91: 'IN', 92: 'PK', 93: 'AF', 94: 'LK', 95: 'MM', 98: 'IR',
  212: 'MA', 213: 'DZ', 216: 'TN', 218: 'LY', 220: 'GM', 221: 'SN',
  222: 'MR', 223: 'ML', 224: 'GN', 225: 'CI', 226: 'BF', 227: 'NE',
  228: 'TG', 229: 'BJ', 230: 'MU', 231: 'LR', 232: 'SL', 233: 'GH',
  234: 'NG', 235: 'TD', 236: 'CF', 237: 'CM', 238: 'CV', 239: 'ST',
  240: 'GQ', 241: 'GA', 242: 'CG', 243: 'CD', 244: 'AO', 245: 'GW',
  246: 'IO', 247: 'AC', 248: 'SC', 249: 'SD', 250: 'RW', 251: 'ET',
  252: 'SO', 253: 'DJ', 254: 'KE', 255: 'TZ', 256: 'UG', 257: 'BI',
  258: 'MZ', 260: 'ZM', 261: 'MG', 262: 'RE', 263: 'ZW', 264: 'NA',
  265: 'MW', 266: 'LS', 267: 'BW', 268: 'SZ', 269: 'KM', 290: 'SH',
  291: 'ER', 297: 'AW', 298: 'FO', 299: 'GL', 350: 'GI', 351: 'PT',
  352: 'LU', 353: 'IE', 354: 'IS', 355: 'AL', 356: 'MT', 357: 'CY',
  358: 'FI', 359: 'BG', 370: 'LT', 371: 'LV', 372: 'EE', 373: 'MD',
  374: 'AM', 375: 'BY', 376: 'AD', 377: 'MC', 378: 'SM', 380: 'UA',
  381: 'RS', 382: 'ME', 385: 'HR', 386: 'SI', 387: 'BA', 389: 'MK',
  420: 'CZ', 421: 'SK', 423: 'LI', 500: 'FK', 501: 'BZ', 502: 'GT',
  503: 'SV', 504: 'HN', 505: 'NI', 506: 'CR', 507: 'PA', 508: 'PM',
  509: 'HT', 590: 'GP', 591: 'BO', 592: 'GY', 593: 'EC', 594: 'GF',
  595: 'PY', 596: 'MQ', 597: 'SR', 598: 'UY', 599: 'AN', 670: 'TL',
  672: 'NF', 673: 'BN', 674: 'NR', 675: 'PG', 676: 'TO', 677: 'SB',
  678: 'VU', 679: 'FJ', 680: 'PW', 681: 'WF', 682: 'CK', 683: 'NU',
  685: 'WS', 686: 'KI', 687: 'NC', 688: 'TV', 689: 'PF', 690: 'TK',
  691: 'FM', 692: 'MH', 850: 'KP', 852: 'HK', 853: 'MO', 855: 'KH',
  856: 'LA', 880: 'BD', 886: 'TW', 960: 'MV', 961: 'LB', 962: 'JO',
  963: 'SY', 964: 'IQ', 965: 'KW', 966: 'SA', 967: 'YE', 968: 'OM',
  970: 'PS', 971: 'AE', 972: 'IL', 973: 'BH', 974: 'QA', 975: 'BT',
  976: 'MN', 977: 'NP', 992: 'TJ', 993: 'TM', 994: 'AZ', 995: 'GE',
  996: 'KG', 998: 'UZ',
};

/**
 * OnlineSIM Provider Adapter
 *
 * Syncs two product types from onlinesim.io:
 *  1. Free shared numbers   (getFreeCountryList)          → subcategory: 'free_number'
 *  2. Paid private SMS      (getNumbersStats per country) → subcategory: 'private_sms'
 *
 * Key improvements over the previous version:
 *  - Uses getNumbersStats.php instead of paginated getTariffs.php → 400+ services per country
 *  - Converts numeric dial codes → ISO 2-letter codes for flag rendering
 *  - Stores logoUrl in features so the UI can display service brand icons
 *  - Stores the popular flag so UI can surface trending services
 *  - Cross-joins services × countries to get accurate per-country stock/pricing
 */
@Injectable()
export class OnlineSIMAdapter implements ProviderAdapter {
  readonly name = 'OnlineSIM';
  private apiKey!: string;
  private baseUrl!: string;

  /** Maps OnlineSIM service slugs to their real domains for Clearbit logo lookup.
   *  Only needed when slug ≠ brand's actual domain (e.g. steam → steampowered.com).
   *  Everything else falls back to `${slug}.com` which Clearbit resolves correctly.
   */
  private readonly DOMAIN_OVERRIDES: Record<string, string> = {
    // Russian/CIS
    vkcom: 'vk.com', vk: 'vk.com', vkontakte: 'vk.com',
    odklru: 'ok.ru', odnoklassniki: 'ok.ru', okru: 'ok.ru',
    yandex: 'yandex.com',
    mailru: 'mail.ru', 'mail_de': 'mail.de',
    rambler: 'rambler.ru',
    mamba: 'mamba.ru',
    citymobil: 'citymobil.ru',
    ozon: 'ozon.ru',
    x5id: 'x5.ru',
    kontaktbar: 'ok.ru',
    clubmln12: 'million-agent.ru',
    mistral: 'mistral.ai',
    toloka: 'toloka.ai',
    youdo: 'youdo.com',
    babka: 'babka.app',
    // Messaging & Social
    linemessenger: 'line.me', line: 'line.me',
    tencentqq: 'qq.com',
    wechat: 'wechat.com', weixin: 'weixin.qq.com',
    kakaotalk: 'kakao.com',
    icq: 'icq.com',
    bip: 'bip.com',
    botim: 'botim.com',
    zalo: 'zalo.me',
    imo: 'imo.im',
    groupme: 'groupme.com',
    band: 'band.us',
    warpcast: 'warpcast.com',
    // Ride & Delivery
    bolt: 'bolt.eu',
    blablacar: 'blablacar.com',
    gett: 'gett.com',
    didi: 'didiglobal.com',
    getir: 'getir.com',
    careem: 'careem.com',
    grab: 'grab.com',
    gojoy: 'gojoy.app',
    freenow: 'free-now.com',
    dott: 'ridedott.com',
    voi: 'voiscooters.com',
    tier: 'tier.app',
    nextaxi: 'nextaxi.de',
    lime: 'li.me',
    nextbike: 'nextbike.de',
    ridemovi: 'ridemovi.com',
    qickscooters: 'qick.app',
    vaimoo: 'vaimoo.com',
    helloride: 'helloride.eu',
    luup: 'luup.com',
    leipzigmove: 'leipzigmove.de',
    // Food & Grocery
    glovo: 'glovoapp.com',
    wolt: 'wolt.com',
    foodpanda: 'foodpanda.com',
    doordash: 'doordash.com',
    mrsool: 'mrsool.co',
    hungerstation: 'hungerstation.com',
    yemeksepeti: 'yemeksepeti.com',
    picnic: 'picnic.app',
    flink: 'goflink.com',
    keeta: 'keeta.com',
    cotticoffee: 'cotticoffee.com',
    espressohouse: 'espressohouse.com',
    joybuy: 'joybuy.com',
    // Gaming
    steam: 'steampowered.com',
    battle_net: 'blizzard.com',
    epicgames: 'epicgames.com', epic: 'epicgames.com',
    wargaming: 'wargaming.net',
    faceit: 'faceit.com',
    roblox: 'roblox.com',
    pubg: 'pubg.com',
    riot: 'riotgames.com',
    g2a: 'g2a.com',
    g2g: 'g2g.com',
    gameflip: 'gameflip.com',
    seagm: 'seagm.com',
    eneba: 'eneba.com',
    offgamers: 'offgamers.com',
    esportal: 'esportal.com',
    playerauctions: 'playerauctions.com',
    ggbet: 'gg.bet',
    ggpoker: 'ggpoker.com',
    pokerstars: 'pokerstars.com',
    pokernex: 'pokernex.com',
    valorant: 'playvalorant.com',
    trovo: 'trovo.live',
    challengermode: 'challengermode.com',
    z2u: 'z2u.com',
    hqtrivia: 'hqtrivia.com',
    eft: 'escapefromtarkov.com',
    // Crypto & Finance
    binance: 'binance.com',
    coinbase: 'coinbase.com',
    bybit: 'bybit.com',
    okx: 'okx.com',
    huobi: 'huobigroup.com',
    kucoinplay: 'kucoin.com',
    kraken: 'kraken.com',
    etoro: 'etoro.com',
    bitstamp: 'bitstamp.net',
    exmo: 'exmo.com',
    bingx: 'bingx.com',
    gemini: 'gemini.com',
    crypto: 'crypto.com',
    ftx: 'ftx.com',
    plus500: 'plus500.com',
    deltaex: 'delta.exchange',
    trastra: 'trastra.com',
    pioneex: 'pionex.com',
    weex: 'weex.com',
    kcex: 'kcex.com',
    hashkeyexchange: 'hashkey.com',
    metamask: 'metamask.io',
    neocrypro: 'neocrypro.com',
    cryptonow: 'cryptonow.ch',
    bitcohunters: 'bitcohunters.com',
    bitjem: 'bitjem.com',
    choise: 'choise.com',
    kalshi: 'kalshi.com',
    immutable: 'immutable.com',
    mtpelerin: 'mtpelerin.com',
    iost: 'iost.io',
    hpool: 'hpool.com',
    sorare: 'sorare.com',
    // Dating & Social
    tinder: 'tinder.com',
    badoo: 'badoo.com',
    bumble: 'bumble.com',
    hinge: 'hinge.co',
    okcupid: 'okcupid.com',
    pof: 'pof.com',
    skout: 'skout.com',
    meetme: 'meetme.com',
    tantan: 'tantanapp.com',
    jiayuan: 'jiayuan.com',
    fetlife: 'fetlife.com',
    happn: 'happn.com',
    zenly: 'zen.ly',
    yalla: 'yalla.com',
    livu: 'livu.app',
    munch: 'munch.com',
    meetic: 'meetic.com',
    lovescout24: 'lovescout24.de',
    ashleymadison: 'ashleymadison.com',
    date50: 'date50.de',
    finya: 'finya.de',
    zweisam: 'zweisam.de',
    bongacams: 'bongacams.com',
    erome: 'erome.com',
    poppen: 'poppen.de',
    '3fun': '3fun.com',
    her: 'weareher.com',
    datingcafe_at: 'datingcafe.at',
    berlinintimde: 'berlinintim.de',
    grommr: 'grommr.com',
    '88date': '88date.com',
    kaufmich: 'kaufmich.com',
    knuddels: 'knuddels.de',
    // E-commerce & Shopping
    aliexpress: 'aliexpress.com',
    alibaba: 'alibaba.com',
    lazada: 'lazada.com',
    shopee: 'shopee.com',
    olx: 'olx.com',
    vinted: 'vinted.com',
    marktplaats: 'marktplaats.nl',
    leboncoin: 'leboncoin.fr',
    wallapop: 'wallapop.com',
    shpock: 'shpock.com',
    catawiki: 'catawiki.com',
    bazos: 'bazos.cz',
    willhaben: 'willhaben.at',
    hepsiburada: 'hepsiburada.com',
    '2dehands': '2dehands.be',
    jollychic: 'jollychic.com',
    temu: 'temu.com',
    shein: 'shein.com',
    footlocker: 'footlocker.com',
    junkyard: 'junkyard.com',
    whatnot: 'whatnot.com',
    hacoo: 'hacoo.com',
    dhgate: 'dhgate.com',
    wog_ua: 'wog.ua',
    intersport: 'intersport.com',
    joeandjuice: 'joejuice.com',
    'joe&thejuice': 'joejuice.com',
    shopback: 'shopback.com',
    // AI & Tech
    openai: 'openai.com',
    claude: 'anthropic.com',
    perplexity: 'perplexity.ai',
    geminicom: 'gemini.google.com',
    kimi: 'kimi.ai',
    lumalabs: 'lumalabs.ai',
    cursor: 'cursor.sh',
    ollama: 'ollama.com',
    manus: 'manus.ai',
    thetawise: 'thetawise.ai',
    clipdrop: 'clipdrop.co',
    factory: 'factory.ai',
    rettellai: 'rettell.ai',
    clarifai: 'clarifai.com',
    serpapi: 'serpapi.com',
    screenpipe: 'screenpi.pe',
    hedra: 'hedra.com',
    cline_bot: 'cline.bot',
    // Cloud & Hosting
    hostinger: 'hostinger.com',
    hetzner: 'hetzner.com',
    linode: 'linode.com',
    cloudways: 'cloudways.com',
    genesiscloud: 'genesiscloud.com',
    porkbun: 'porkbun.com',
    namecheap: 'namecheap.com',
    zeabur: 'zeabur.com',
    strato: 'strato.de',
    webgo: 'webgo.de',
    world4you: 'world4you.com',
    beget: 'beget.com',
    friendhosting: 'friendhosting.net',
    thehosting: 'thehosting.io',
    webhost1: 'webhost1.com',
    astroproxy: 'astroproxy.com',
    mobileproxy: 'mobileproxy.space',
    gns: 'gns3.com',
    byteplus: 'byteplus.com',
    nlstar_com: 'nlstar.com',
    // Professional & Freelance
    freelancer: 'freelancer.com',
    fiverr: 'fiverr.com',
    indeed: 'indeed.com',
    glassdoor: 'glassdoor.com',
    guru: 'guru.com',
    prontopro: 'prontopro.it',
    apprentus: 'apprentus.com',
    handshake: 'joinhandshake.com',
    telusdigital: 'telusinternational.com',
    oneforma: 'oneforma.com',
    microworkers: 'microworkers.com',
    swagbucks: 'swagbucks.com',
    adgatemedia: 'adgatemedia.com',
    freecash: 'freecash.com',
    appbonus: 'appbonus.ru',
    nielsen: 'nielsen.com',
    norstatpanel: 'norstat.com',
    surveyo24: 'surveyo24.com',
    gfk: 'gfk.com',
    grapedata: 'grapedata.com',
    usercrowd: 'usercrowd.com',
    yougovshoper: 'yougov.com',
    signalstart: 'signalstart.com',
    // Betting & Casino
    bet365: 'bet365.com',
    betano: 'betano.com',
    betboom: 'betboom.com',
    '22bet': '22bet.com',
    linebet: 'linebet.com',
    jackpotpiraten: 'jackpotpiraten.de',
    vulkanvegas: 'vulkanvegas.com',
    onecasino: 'one.casino',
    machancecasino: 'machance.com',
    beefcasino141: 'beefcasino.com',
    slotsstake: 'slotsstake.com',
    slotoro: 'slotoro.com',
    bestwinzz_net: 'bestwinzz.net',
    coldbet: 'coldbet.com',
    '55bet': '55bet.com',
    livecams: 'livecams.com',
    // Productivity & Services
    zoho: 'zoho.com',
    adobe: 'adobe.com',
    nvidia: 'nvidia.com',
    ubisoft: 'ubisoft.com',
    docusign: 'docusign.com',
    twilio: 'twilio.com',
    mailgun: 'mailgun.com',
    sendpulse: 'sendpulse.com',
    smtp2go: 'smtp2go.com',
    zadarma: 'zadarma.com',
    talk360: 'talk360.com',
    bulksms: 'bulksms.com',
    proton: 'protonmail.com',
    inbox_lv: 'inbox.lv',
    gmx: 'gmx.com',
    freenet: 'freenet.de',
    web_de: 'web.de',
    tonline: 't-online.de',
    // Travel & Lifestyle
    opodo: 'opodo.com',
    edreams: 'edreams.com',
    airwick: 'airwick.com',
    classpass: 'classpass.com',
    doctolib: 'doctolib.fr',
    doctena: 'doctena.com',
    teleclinic: 'teleclinic.com',
    drflex: 'drflex.ru',
    // Logistics
    dhl: 'dhl.com',
    ups: 'ups.com',
    // Misc brands
    naver: 'naver.com',
    bilibili: 'bilibili.com',
    xiaohongshu: 'xiaohongshu.com',
    bigo: 'bigo.tv',
    odysee: 'odysee.com',
    substack: 'substack.com',
    nextdoor: 'nextdoor.com',
    chess: 'chess.com',
    livescore: 'livescore.com',
    fanzone: 'fanzone.io',
    distrokid: 'distrokid.com',
    templatemonster: 'templatemonster.com',
    vestiairecollective: 'vestiairecollective.com',
    crowdfarming: 'crowdfarming.com',
    samsungshop: 'samsung.com',
    zara: 'zara.com',
    adidas: 'adidas.com',
    nike: 'nike.com',
    audi: 'audi.com',
    lidl: 'lidl.com',
    edeka: 'edeka.de',
    abbottnutrition: 'abbott.com', abbott: 'abbott.com',
    pampers: 'pampers.com',
    lenor: 'lenor.com',
    ariel: 'ariel.com',
    check24: 'check24.de',
    immoscout24: 'immoscout24.de',
    immowelt: 'immowelt.de',
    meinestadt: 'meinestadt.de',
    huk24: 'huk24.de',
    handyticket: 'handyticket.de',
    stawag: 'stawag.de',
    nebenan: 'nebenan.de',
    clark: 'clark.de',
    quoka: 'quoka.de',
    markt: 'markt.de',
    entscheiderclub: 'entscheiderclub.de',
    liebe: 'liebe.de',
    snautz: 'snautz.de',
    ovoenergy: 'ovoenergy.com',
    labayh: 'labayh.com',
    myglo: 'glo.com',
    iqos: 'iqos.com',
    atlasearth: 'atlasearth.com',
    gamsgo: 'gamsgo.com',
    heycash: 'heycash.me',
    toyou: 'to-you.com',
    lolcalhub: 'lolcalhub.com',
    shoop: 'shoop.de',
    igraal: 'igraal.com',
    tribbu: 'tribbu.com',
    topcashback: 'topcashback.co.uk',
    cashback: 'cashback.de',
    joinbrands: 'joinbrands.com',
    appinio: 'appinio.com',
    brevo: 'brevo.com',
    hubspot: 'hubspot.com',
    sumsub: 'sumsub.com',
    twitch: 'twitch.tv',
    poppolive: 'poppolive.com',
    soulchill: 'soulchill.io',
    hsl: 'hsl.fi',
    frecciaplay: 'frecciaplay.it',
    basechat: 'basechat.ch',
    wplace: 'wplace.ru',
    jam: 'jam.com',
    turo: 'turo.com',
    rentahuman: 'rentahuman.com',
    ceair: 'ce-air.com',
    greenweez: 'greenweez.com',
    posh: 'posh.com',
    axs: 'axs.com',
    spin: 'spin.pm',
    phound: 'phound.com',
    jakiito: 'jakiito.com',
    avanture: 'avanture.hr',
  };


  private serviceLogoUrl(slug: string, serviceName: string): string {
    const key = slug.toLowerCase().replace(/[^a-z0-9]/g, '');
    const nameKey = serviceName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const domain =
      this.DOMAIN_OVERRIDES[key] ??
      this.DOMAIN_OVERRIDES[nameKey] ??
      `${key}.com`;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  }

  constructor(private logger: LoggerService) {}

  configure(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async healthCheck(): Promise<{ healthy: boolean; responseTimeMs: number; message?: string }> {
    const start = Date.now();
    try {
      await this.makeRequest('/api/getBalance.php');
      return { healthy: true, responseTimeMs: Date.now() - start };
    } catch (error) {
      return { healthy: false, responseTimeMs: Date.now() - start, message: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Returns both free numbers and paid private activations.
   *
   * Strategy:
   *  - Free: one entry per country from getFreeCountryList (22 countries)
   *  - Paid: fetch all countries from getTariffs, then getNumbersStats per country
   *    to get accurate per-country stock count and price (400+ services × N countries)
   *    We deduplicate by slug so each service appears once with the best price.
   */
  async listServices(): Promise<ProviderService[]> {
    // ── 1. Fetch free countries and the full country list in parallel ─────────
    const [freeCountriesRes, tariffsRes] = await Promise.all([
      this.makeRequest('/api/getFreeCountryList.php'),
      this.makeRequest('/api/getTariffs.php'),
    ]);

    const freeCountriesRaw: Array<{ country: number; country_text: string }> =
      freeCountriesRes.countries || [];

    const allCountriesObj: Record<string, { name: string; original: string; code: number; enable: boolean }> =
      tariffsRes.countries || {};
    const allCountries = Object.values(allCountriesObj).filter((c) => c.enable);

    // ── 2. Free number products ──────────────────────────────────────────────
    const freeNumberProducts: ProviderService[] = freeCountriesRaw.map((c) => {
      const isoCode = DIAL_TO_ISO[c.country] ?? '';
      return {
        externalId: `free_${c.country}`,
        name: `Free Number – ${c.country_text}`,
        description: `Shared public phone number in ${c.country_text}. Free to use all incoming messages are publicly visible.`,
        category: 'NUMBER',
        platform: 'Public SMS',
        subcategory: 'free_number',
        price: 0,
        minQty: 1,
        maxQty: 1,
        currency: 'USD',
        available: true,
        inStock: true,
        estimatedTime: 'Instant',
        countries: [{
          code: isoCode || c.country.toString(),
          name: c.country_text,
          available: true,
        }],
        features: {
          serviceType: 'free_sms',
          isPublic: true,
          countryCode: c.country,
          isoCode,
        },
      };
    });

    // ── 3. Paid private activation products ──────────────────────────────────
    // Fetch getNumbersStats for every enabled country in parallel (batched to
    // avoid hammering the API). We dedupe by slug, keeping the cheapest price
    // and summing stock across countries.
    const BATCH = 10;
    const serviceMap = new Map<string, {
      svc: any;
      totalCount: number;
      minPrice: number;
      countriesAvailable: Array<{ code: string; name: string; available: boolean }>;
    }>();

    for (let i = 0; i < allCountries.length; i += BATCH) {
      const batch = allCountries.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (country) => {
          try {
            const statsRes = await this.makeRequest('/api/getNumbersStats.php', {
              country: country.code,
            });
            const services: Record<string, any> = statsRes.services || {};
            const isoCode = DIAL_TO_ISO[country.code] ?? '';

            for (const [, svc] of Object.entries(services)) {
              const slug = svc.slug || svc.service.toLowerCase().replace(/\s+/g, '_');
              const price = parseFloat(svc.price) || 0;
              const count = parseInt(svc.count, 10) || 0;
              const existing = serviceMap.get(slug);

              if (!existing) {
                serviceMap.set(slug, {
                  svc,
                  totalCount: count,
                  minPrice: price,
                  countriesAvailable: count > 0 ? [{ code: isoCode || country.code.toString(), name: country.original, available: true }] : [],
                });
              } else {
                existing.totalCount += count;
                if (price < existing.minPrice) existing.minPrice = price;
                if (count > 0) {
                  existing.countriesAvailable.push({
                    code: isoCode || country.code.toString(),
                    name: country.original,
                    available: true,
                  });
                }
              }
            }
          } catch (err) {
            this.logger.warn(`OnlineSIM: failed to fetch stats for country ${country.code}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }),
      );
    }

    const paidNumberProducts: ProviderService[] = Array.from(serviceMap.entries()).map(
      ([slug, { svc, totalCount, minPrice, countriesAvailable }]) => ({
        externalId: slug,
        name: svc.service,
        description: `Private one-time SMS verification for ${svc.service}. Number is exclusive to you.`,
        category: 'NUMBER',
          platform: svc.service,
        subcategory: 'private_sms',
        price: minPrice,
        minQty: 1,
        maxQty: 100,
        currency: 'USD',
        available: totalCount > 0,
        inStock: totalCount > 0,
        stockQty: totalCount,
        estimatedTime: 'Instant',
        countries: countriesAvailable,
        features: {
          serviceType: 'private_sms',
          isPublic: false,
          popular: svc.popular ?? false,
          logoUrl: this.serviceLogoUrl(slug, svc.service),
          serviceId: svc.id,
        },
      }),
    );

    this.logger.log(
      `OnlineSIM sync: ${freeNumberProducts.length} free countries, ${paidNumberProducts.length} paid services`,
    );

    return [...freeNumberProducts, ...paidNumberProducts];
  }

  async getServiceDetails(externalId: string): Promise<ProviderService | null> {
    const services = await this.listServices();
    return services.find((s) => s.externalId === externalId) || null;
  }

  async checkAvailability(serviceId: string, quantity: number): Promise<boolean> {
    if (serviceId.startsWith('free_')) return true;
    try {
      const response = await this.makeRequest('/api/getTariffs.php', {
        filter_service: serviceId,
      });
      const services = response.services || {};
      const service = Object.values(services).find(
        (s: any) => s.slug === serviceId || s.service === serviceId,
      );
      return service ? (service as any).count >= quantity : false;
    } catch {
      return false;
    }
  }

  /**
   * Creates an order for either a free number or a paid private activation.
   */
  async createOrder(request: ProviderOrderRequest): Promise<ProviderOrderResponse> {
    const isFreeService = request.serviceId.startsWith('free_');
    const isRental = request.customData?.numberType === 'rental';
    const isESIM = request.customData?.numberType === 'esim';

    // ── Free number flow ─────────────────────────────────────────────────────
    if (isFreeService) {
      const countryCode = request.serviceId.replace('free_', '');
      const response = await this.makeRequest('/api/getFreeList', {
        country: countryCode,
      });

      // /api/getFreeList returns `numbers` as an object keyed by local number,
      // each entry containing a `full_number` field with the E.164 value.
      const numbersObj: Record<string, any> = response.numbers || {};
      const entries = Object.entries(numbersObj);
      if (!entries.length) {
        throw new Error(`No free numbers currently available for country ${countryCode}.`);
      }

      const [localNumber, data] = entries[0];
      const pickedNumber: string = data.full_number || `+${countryCode}${localNumber}`;

      return {
        providerOrderId: `FREE_${pickedNumber}`,
        status: 'ACTIVE',
        deliveryData: {
          phoneNumber: pickedNumber,
          countryCode,
          isPublic: true,
          note: 'This is a shared public number. All incoming SMS are visible to everyone.',
        },
      };
    }

    // ── Paid private number flow ─────────────────────────────────────────────
    let endpoint = '/api/getNum.php';
    let params: any = {
      service: request.serviceId,
      country: request.customData?.country || 7,
    };

    if (isRental) {
      endpoint = '/api/rentNum.php';
      params = {
        service: request.serviceId,
        country: request.customData?.country || 7,
        days: request.customData?.days || 1,
      };
    } else if (isESIM) {
      endpoint = '/api/getESim.php';
      params = {
        service: request.serviceId,
        country: request.customData?.country || 7,
      };
    }

    const response = await this.makeRequest(endpoint, params);

    return {
      providerOrderId: response.tzid.toString(),
      status: 'PROCESSING',
      deliveryData: {
        phoneNumber: response.number,
        countryCode: request.customData?.country,
        isPublic: false,
      },
    };
  }

  async getOrderStatus(providerOrderId: string): Promise<ProviderOrderStatus> {
    // ── Free number status ───────────────────────────────────────────────────
    if (providerOrderId.startsWith('FREE_')) {
      const phoneNumber = providerOrderId.replace('FREE_', '');

      // Strip the country code from the full E.164 number to get the local
      // subscriber digits required by /api/getFreeList's `number` param.
      let localNumber = phoneNumber.replace(/^\+/, '');
      let countryCode: string | number | undefined;
      const dialCodes = Object.keys(DIAL_TO_ISO)
        .map(Number)
        .sort((a, b) => String(b).length - String(a).length || b - a);
      for (const dc of dialCodes) {
        if (localNumber.startsWith(String(dc))) {
          countryCode = dc;
          localNumber = localNumber.slice(String(dc).length);
          break;
        }
      }

      const response = await this.makeRequest('/api/getFreeList', {
        country: countryCode,
        number: localNumber || phoneNumber,
      });

      // Messages are in response.messages.data (paginated array)
      const msgsContainer = response.messages;
      const rawMessages: any[] = Array.isArray(msgsContainer)
        ? msgsContainer
        : Array.isArray(msgsContainer?.data)
          ? msgsContainer.data
          : [];

      const messages = rawMessages.map((m: any) => ({
        from: m.in_number ?? m.sender ?? m.from,
        text: m.text ?? m.message,
        receivedAt: m.created_at ?? m.date,
      }));

      return {
        status: 'ACTIVE',
        completed: messages.length,
        total: messages.length,
        deliveryData: {
          phoneNumber,
          isPublic: true,
          messages,
        },
      };
    }

    // ── Paid private number status ───────────────────────────────────────────
    const response = await this.makeRequest('/api/getState.php', {
      tzid: providerOrderId,
    });

    const msg = Array.isArray(response) ? response[0] : response;
    const statusMap: Record<string, string> = {
      TZ_NUM_WAIT: 'PROCESSING',
      TZ_NUM_ANSWER: 'COMPLETED',
      TZ_OVER_EMPTY: 'FAILED',
      TZ_OVER_OK: 'COMPLETED',
      TZ_NUM_PREPARE: 'PROCESSING',
      TZ_INPOOL: 'PROCESSING',
    };

    const deliveryData: any = { isPublic: false };
    if (msg?.msg) deliveryData.sms = msg.msg;
    if (msg?.number) deliveryData.phoneNumber = msg.number;
    if (msg?.country) deliveryData.countryCode = msg.country;

    return {
      status: statusMap[msg?.response] || 'PROCESSING',
      completed: msg?.response === 'TZ_NUM_ANSWER' || msg?.response === 'TZ_OVER_OK' ? 1 : 0,
      total: 1,
      deliveryData: Object.keys(deliveryData).length > 1 ? deliveryData : undefined,
    };
  }

  async cancelOrder(providerOrderId: string): Promise<boolean> {
    if (providerOrderId.startsWith('FREE_')) return true;
    try {
      await this.makeRequest('/api/setOperationOk.php', { tzid: providerOrderId });
      return true;
    } catch {
      return false;
    }
  }

  async getBalance(): Promise<{ balance: number; currency: string }> {
    const response = await this.makeRequest('/api/getBalance.php');
    return {
      balance: parseFloat(response.balance),
      currency: 'USD',
    };
  }

  /** Fetches live free numbers for a country (used by frontend live inbox). */
  async getFreeNumbers(countryCode: number | string): Promise<any[]> {
    // OnlineSIM's /api/getFreeList returns `numbers` as an object keyed by
    // the local subscriber number, each entry having a `full_number` field
    // with the complete E.164 number (e.g. "+79915584911").
    const response = await this.makeRequest('/api/getFreeList', {
      country: countryCode,
    });

    const numbersObj: Record<string, any> = response.numbers || {};

    // Convert the object into a flat array; each item includes the local key
    // as `number` and the full E.164 string as `full_number`.
    return Object.entries(numbersObj).map(([localNumber, data]) => ({
      number: localNumber,
      full_number: data.full_number ?? `+${countryCode}${localNumber}`,
      updated_at: data.data_humans ?? undefined,
      ...data,
    }));
  }

  /** Fetches all publicly visible SMS messages for a specific free number. */
  async getFreeMessages(phoneNumber: string): Promise<any[]> {
    // phoneNumber may be a full E.164 string (e.g. "+79915584911") or a local
    // number. The OnlineSIM /api/getFreeList endpoint expects `country` (numeric
    // dial code) and `number` (local subscriber digits, no leading +/country).
    // We try to strip a leading + and known country prefix by brute-force
    // matching against DIAL_TO_ISO keys, longest prefix first.
    let localNumber = phoneNumber.replace(/^\+/, '');
    let countryCode: string | number | undefined;

    // Sort dial codes by length descending so we match longest prefix first
    // (e.g. 212 before 2).
    const dialCodes = Object.keys(DIAL_TO_ISO)
      .map(Number)
      .sort((a, b) => String(b).length - String(a).length || b - a);

    for (const dc of dialCodes) {
      if (localNumber.startsWith(String(dc))) {
        countryCode = dc;
        localNumber = localNumber.slice(String(dc).length);
        break;
      }
    }

    const response = await this.makeRequest('/api/getFreeList', {
      country: countryCode,
      number: localNumber || phoneNumber,
    });

    // Messages are in response.messages.data (paginated) or response.messages
    const msgs = response.messages;
    if (!msgs) return [];
    if (Array.isArray(msgs)) return msgs;
    if (Array.isArray(msgs.data)) {
      return msgs.data.map((m: any) => ({
        sender: m.in_number ?? m.sender,
        from: m.in_number ?? m.from,
        text: m.text ?? m.message,
        date: m.created_at ?? m.date,
      }));
    }
    return [];
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}) {
    const url = new URL(endpoint, this.baseUrl);
    url.searchParams.append('apikey', this.apiKey);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.append(key, String(value));
    });

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`OnlineSIM API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data?.response && typeof data.response === 'string' && data.response.startsWith('ERROR')) {
      throw new Error(`OnlineSIM error: ${data.response}`);
    }

    return data;
  }
}
