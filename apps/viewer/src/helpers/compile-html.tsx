import hbs from 'handlebars';

hbs.registerHelper('json', (context) => JSON.stringify(context));

export const compileHtml = (html: string, data: any) => {
  // Ensure data is wrapped in an array as expected by the template
  const context = { data: [data] };
  return hbs.compile(html)(context);
};
