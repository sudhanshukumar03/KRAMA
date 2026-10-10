import type { IndianHolidayDate, IndianHolidayKind, IndianRegionalCalendar } from './indianHolidayData';

function entries(kind: IndianHolidayKind, list: string): IndianHolidayDate[] {
  return list.trim().split('\n').map(line => {
    const [date, ...name] = line.split('|');
    return { date: `2026-${date}`, name: name.join('|'), kind };
  });
}

// Transcribed from the public/closed and restricted tables, not bank calendars.
// Dates apply only to 2026. Each calendar retains its government publication.
export const INDIA_GOVERNMENT_2026: Record<string, IndianRegionalCalendar> = {
  AN: {
    name: 'Andaman and Nicobar Islands',
    sourceUrl: 'https://andamannicobar.gov.in/admin-pannel/othersdoc/1-29-Holiday%20List%202026%20Gazette.pdf',
    holidays: [
      ...entries('PUBLIC', `01-26|Republic Day
03-04|Holi
03-21|Id-ul-Fitr
03-26|Ram Navami
04-03|Good Friday
05-01|Buddha Purnima
06-26|Muharram
08-15|Independence Day
08-26|Milad-un-Nabi
08-26|Onam
10-02|Mahatma Gandhi's Birthday
10-20|Dussehra
11-08|Diwali
11-24|Guru Nanak's Birthday
12-25|Christmas Day`),
      { date: '2026-04-14', name: "Dr. B. R. Ambedkar's Birthday", kind: 'PUBLIC', sourceUrl: 'https://dt.andamannicobar.gov.in/epaper/15042026100010632.pdf' },
      { date: '2026-05-28', name: 'Id-ul-Zuha (Bakrid)', kind: 'PUBLIC', sourceUrl: 'https://dt.andamannicobar.gov.in/epaper/27052026092402123.pdf', note: 'Moved from May 27 by the Administration following moon sighting.' },
      ...entries('OPTIONAL', `01-01|New Year's Day
01-03|Hazrat Ali's Birthday
01-14|Makar Sankranti / Magha Bihu / Pongal
01-23|Basant Panchami
02-01|Guru Ravidas's Birthday
02-12|Swami Dayananda Saraswati's Birthday
02-15|Maha Shivratri
02-19|Shivaji Jayanti
03-03|Holika Dahan / Dolyatra
03-19|Chaitra Sukladi / Gudi Padava / Ugadi / Cheti Chand
03-20|Jamat-ul-Vida
03-31|Mahavir Jayanti
04-05|Easter Sunday
04-14|Vaisakhi / Vishu / Tamil New Year's Day
04-15|Vaisakhadi / Bahag Bihu
05-09|Rabindranath Tagore's Birthday
07-16|Rath Yatra
08-15|Parsi New Year's Day
08-28|Raksha Bandhan
09-04|Janmashtami
09-14|Ganesh Chaturthi
10-18|Dussehra (Saptami)
10-19|Dussehra (Mahashtami)
10-20|Dussehra (Mahanavami)
10-26|Maharishi Valmiki's Birthday
10-29|Karwa Chauth
11-08|Naraka Chaturdasi
11-09|Govardhan Puja
11-11|Bhai Duj
11-15|Chhat Puja
11-24|Guru Teg Bahadur's Martyrdom Day
12-23|Hazrat Ali's Birthday
12-24|Christmas Eve
12-30|First Flag Hoisting of Independent India`),
    ],
  },
  DH: {
    name: 'Dadra and Nagar Haveli and Daman and Diu',
    sourceUrl: 'https://cdnbbsr.s3waas.gov.in/s371e09b16e21f7b6919bbfc43f6a5b2f0/uploads/2026/01/202601061474429779.pdf#page=64',
    holidays: [
      ...entries('PUBLIC', `01-14|Makar Sankranti / Magha Bihu / Pongal
01-26|Republic Day
03-04|Holi
03-19|Chaitra Sukladi / Gudi Padava / Ugadi / Cheti Chand
03-21|Id-ul-Fitr
03-26|Ram Navami
03-31|Mahavir Jayanti
04-03|Good Friday
08-15|Independence Day / Parsi New Year's Day
08-26|Milad-un-Nabi
08-28|Raksha Bandhan
09-04|Janmashtami
09-14|Ganesh Chaturthi
10-02|Mahatma Gandhi's Birthday
10-20|Dussehra
11-09|Govardhan Puja
12-25|Christmas Day`),
      ...entries('OPTIONAL', `01-01|New Year's Day
01-03|Hazrat Ali's Birthday
01-23|Basant Panchami
02-01|Guru Ravidas's Birthday
02-12|Swami Dayananda Saraswati's Birthday
02-19|Shivaji Jayanti
03-03|Holika Dahan
03-03|Dolyatra
03-20|Jamat-ul-Vida
04-05|Easter Sunday
04-14|Vaisakhi / Vishu / Tamil New Year's Day
04-15|Vaisakhadi / Bahag Bihu
05-01|Buddha Purnima
05-09|Rabindranath Tagore's Birthday
05-27|Id-ul-Zuha (Bakrid)
06-26|Muharram
07-16|Rath Yatra
08-26|Onam
10-18|Dussehra (Saptami)
10-19|Dussehra (Mahashtami)
10-26|Maharishi Valmiki's Birthday
10-29|Karwa Chauth
11-11|Bhai Duj
11-24|Guru Teg Bahadur's Martyrdom Day / Guru Nanak's Birthday
12-23|Hazrat Ali's Birthday
12-24|Christmas Eve`),
      ...entries('OBSERVANCE', `02-15|Maha Shivratri
11-08|Diwali
11-15|Chhat Puja`),
      ...entries('BANK', '04-01|Annual Closing of Bank Accounts'),
    ],
  },
  LA: {
    name: 'Ladakh',
    sourceUrl: 'https://cdn.s3waas.gov.in/s341ae36ecb9b3eee609d05b90c14222fb/uploads/2025/11/17631844945463.pdf',
    holidays: [
      ...entries('PUBLIC', `01-26|Republic Day
03-04|Holi
03-21|Nauroz
03-21|Eid-ul-Fitr
04-14|Dr. B. R. Ambedkar's Birthday
05-01|Buddha Purnima
05-27|Eid-ul-Azha (Bakrid)
06-26|Muharram
08-15|Independence Day
08-26|Eid-i-Milad-ul-Nabi
10-02|Mahatma Gandhi's Birthday
10-20|Dussehra
11-08|Diwali
11-24|Guru Nanak's Birthday
12-09|Losar
12-25|Christmas Day`),
      ...entries('OPTIONAL', `01-03|Hazrat Ali's Birthday
01-05|Guru Gobind Singh's Birthday
01-13|Lohri
01-17|Shab-I-Miraj
02-15|Maha Shivratri
03-03|Tangpe Chongya
03-13|Shab-I-Qadr
03-19|First Navratra
03-20|Jumat-ul-Vida
03-26|Ram Navami
04-03|Good Friday
04-14|Vaisakhi
06-04|Eid-e-Ghadeer
06-18|Guru Arjun Dev's Martyrdom Day
07-05|Guru Hargobind Singh's Birthday
08-28|Raksha Bandhan
08-28|Friday following Eid-i-Milad-ul-Nabi
09-04|Janmashtami
10-20|Mahanavami`),
      ...entries('LOCAL', `02-16|Mela Dosmochey (Leh and Zanskar only)
06-04|Eid-e-Ghadeer (Kargil only)
06-24|Hemis Tsechu (Leh only)
08-04|Chehlum (Kargil only)`),
      ...entries('BANK', '04-01|Annual Closing of Bank Accounts'),
    ],
  },
  LD: {
    name: 'Lakshadweep',
    sourceUrl: 'https://cdn.s3waas.gov.in/s358238e9ae2dd305d79c2ebc8c1883422/uploads/2026/01/17681938343951.pdf',
    holidays: [
      ...entries('PUBLIC', `01-14|Pongal / Makar Sankranti
01-26|Republic Day
03-04|Holi
03-21|Id-ul-Fitr
03-26|Ram Navami
03-31|Mahavir Jayanti
05-01|Buddha Purnima
05-27|Id-ul-Zuha (Bakrid)
06-26|Muharram
08-15|Independence Day / Naoraz
08-26|Onam / Milad-un-Nabi
09-04|Janmashtami
09-14|Ganesh Chaturthi
10-02|Gandhi Jayanti
10-20|Dussehra
11-24|Guru Nanak's Birthday
12-25|Christmas Day`),
      ...entries('OPTIONAL', `01-01|New Year's Day
01-03|Hazrat Ali's Birthday
01-16|Rajab 27
01-23|Basant Panchami
02-01|Guru Ravidas's Birthday
02-12|Swami Dayananda Saraswati's Birthday
02-15|Maha Shivratri
03-03|Holika Dahan
03-03|Dolyatra
03-17|Ramzan 27
03-19|Chaitra Sukladi / Gudi Padava / Ugadi / Cheti Chand
03-20|Jamat-ul-Vida
04-03|Good Friday
04-05|Easter Sunday
04-14|Vaisakhi / Vishu / Tamil New Year's Day
04-15|Vaisakhadi / Bahag Bihu
05-09|Rabindranath Tagore's Birthday
07-16|Rath Yatra
08-15|Parsi New Year's Day
08-28|Raksha Bandhan
10-18|Dussehra (Saptami)
10-19|Dussehra (Mahashtami)
10-20|Dussehra (Mahanavami)
10-26|Maharishi Valmiki's Birthday
10-29|Karwa Chauth
11-08|Diwali
11-08|Naraka Chaturdasi
11-09|Govardhan Puja
11-11|Bhai Duj
11-15|Chhat Puja
11-24|Guru Teg Bahadur's Martyrdom Day
12-23|Hazrat Ali's Birthday
12-24|Christmas Eve`),
      // The notification prints 19.02.2025 for Shivaji Jayanti. Do not invent
      // a correction: the malformed-year entry is omitted pending clarification.
      ...entries('BANK', '04-01|Annual Closing of Bank Accounts'),
    ],
  },
};
