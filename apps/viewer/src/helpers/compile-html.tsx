import hbs from 'handlebars';

hbs.registerHelper('json', (context) => JSON.stringify(context));

export const compileHtml = (html: string, data: any, newVersion: boolean = false) => {
  // Ensure data is wrapped in an array as expected by the template
  let value = undefined;
  if (newVersion) {
    value = data.data;
  }
  const context = newVersion ? { data: [value] } : { data: [data] };
  return hbs.compile(html)(context);
};
