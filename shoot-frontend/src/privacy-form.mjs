// This local copy validates the captured public fields. It never sends personal
// data to OneTrust or stores the entered values.
export function setupPrivacyForm(root) {
  const form = root.querySelector('.privacy-request');
  if (!form) return () => {};
  const country = form.querySelector('#privacy-country');
  const display = new Intl.DisplayNames(['en'], {type: 'region'});
  const codes = 'AF AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BA BW BR BN BG BF BI KH CM CA CV KY CF TD CL CN CO KM CG CD CK CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE ET FK FO FJ FI FR GF PF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MK MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA SS ES LK SD SR SJ SZ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VA VE VN VG VI WF EH YE ZM ZW'.split(' ');
  for (const code of codes.sort((a, b) => display.of(a).localeCompare(display.of(b)))) {
    const option = document.createElement('option'); option.value = code; option.textContent = display.of(code); country.append(option);
  }
  const submit = event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const result = root.querySelector('.privacy-result');
    result.hidden = false;
    result.textContent = 'This local preview has validated your form. Your privacy request has not been submitted or stored.';
    result.focus();
  };
  form.addEventListener('submit', submit);
  return () => form.removeEventListener('submit', submit);
}
