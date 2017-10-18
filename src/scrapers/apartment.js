const cheerio = require('cheerio');

/**
 * @author eisverticker
 */
function checkForWBS(textRaw) {
  const text = textRaw.toLowerCase();
  if(text.indexOf('wbs') !== -1 || text.indexOf('wohnberechtigungsschein') !== -1) {
    if(
      text.indexOf('kein wbs') !== -1 ||
      text.indexOf('kein wohnberechtigungsschein') !== -1 ||
      text.indexOf('nicht wbs') !== -1 ||
      text.indexOf('wbs wird nicht') !== -1 ||
      text.indexOf('wohnberechtigungsschein wird nicht') !== -1 ||
      text.indexOf('wbs ist nicht') !== -1 ||
      text.indexOf('wohnberechtigungsschein ist nicht') !== -1
    ) {
      return "no";
    }else{
      return "yes"
    }
  }else{
    return "unknown";
  }
}

const parseArea = (text) => {
    const areaRegex = /(\d*.\d*) m²/.exec(text);
    return areaRegex ? parseFloat(areaRegex[1].replace(',', '.')) : null;
};

const parsePrice = (text) => {
    const sanitizedText = text.replace('.', '').replace(',', '.');
    const priceRegex = /(\d+\D?\d*)\s*€/.exec(sanitizedText);
    return priceRegex ? parseFloat(priceRegex[1]) : null;
};

const scrapAddress = (addressBlock) => {
    const result = {};

    const splittedAddressBlock = addressBlock.split(',');
    if (splittedAddressBlock.length === 3) {
        const addressRegex = /(\d{5}) (\S+)/.exec(splittedAddressBlock[1]);

        result.address = splittedAddressBlock[0];
        result.postalCode = addressRegex ? addressRegex[1] : null;
        result.city = addressRegex ? addressRegex[2] : null;
    } else if (splittedAddressBlock.length === 1) {
        const addressRegex = /(\d{5}) (\S+)/.exec(splittedAddressBlock[0]);

        result.postalCode = addressRegex ? addressRegex[1] : null;
        result.city = addressRegex ? addressRegex[2] : null;
    }

    return result;
};

const scrapImages = (sliderBlock) => {
    if (!sliderBlock.length) {
        return [];
    }
    return sliderBlock.find('img.sp-image').map((i, img) => img.attribs['data-src']).get();
};

const parseAvailableFrom = (text) => {
    if (text) {
        const dateRegex = /^\D+(\d{1,2}\.\d{1,2}\.\d{4})\s*$/.exec(text);
        if (dateRegex) {
            const dateStr = dateRegex[1].split('.').reverse().join('-');
            const date = new Date(dateStr);
            return {
                availableFrom: date,
                isAvailable: date.getTime() < (new Date()).getTime(),
            };
        } else if (text.trim() === 'sofort') {
            return {
                availableFrom: null,
                isAvailable: true,
            };
        }
    }
    return {
        availableFrom: null,
        isAvailable: false,
    };
};

exports.scrap = (page) => {
    const $ = cheerio.load(page, {
        decodeEntities: false,
        normalizeWhitespace: true,
    });

    let apartment = {};

    // this does not work anymore (let's try to get the id from the url)
    // apartment.id = $('[name="exposeId"]').val();
    apartment.rentBase = parsePrice($('.is24qa-kaltmiete').text());
    apartment.rentTotal = parsePrice($('.is24qa-gesamtmiete').text());
    apartment.area = parseArea($('.is24qa-wohnflaeche-ca').text().replace(',', '.'));
    apartment.rooms = parseInt($('.is24qa-zi').text(), 10);
    apartment.images = scrapImages($('#slideImageContainer'));
    apartment.wbsOccurence = checkForWBS(page);

    const availability = parseAvailableFrom($('.is24qa-bezugsfrei-ab').text());
    apartment = Object.assign(apartment, availability);

    const addressBlock = $('h4 .address-block [data-ng-non-bindable]');
    if (addressBlock && addressBlock.text().trim()) {
        const addressInfo = scrapAddress(addressBlock.text().trim());
        apartment = Object.assign(apartment, addressInfo);
    }

    return apartment;
};
