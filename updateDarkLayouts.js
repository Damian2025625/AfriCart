const fs = require('fs');

const files = [
  'src/app/dashboard/customer/layout.jsx',
  'src/app/dashboard/vendor/layout.jsx'
];

const patterns = [
  [/bg-white(?!\sdark:)/g, 'bg-white dark:bg-white'],
  [/bg-gray-50(?!\sdark:)/g, 'bg-gray-50 dark:bg-white'],
  [/text-gray-900(?!\sdark:)/g, 'text-gray-900 dark:text-white'],
  [/text-gray-800(?!\sdark:)/g, 'text-gray-800 dark:text-white'],
  [/text-gray-700(?!\sdark:)/g, 'text-gray-700 dark:text-white'],
  [/text-gray-600(?!\sdark:)/g, 'text-gray-600 dark:text-white'],
  [/text-gray-500(?!\sdark:)/g, 'text-gray-500 dark:text-white'],
  [/border-gray-100(?!\sdark:)/g, 'border-gray-100 dark:border-gray-800'],
  [/border-gray-200(?!\sdark:)/g, 'border-gray-200 dark:border-gray-700'],
  [/border-white(?!\sdark:)/g, 'border-white dark:border-gray-900'],
  [/text-gray-400(?!\sdark:)/g, 'text-gray-400 dark:text-white']
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  patterns.forEach(([regex, replacement]) => {
    content = content.replace(regex, replacement);
  });

  // Since layout shouldn't hold setting state implicitly, but Next.js SSR means it runs 
  // we add a straightforward useLayoutEffect or script check to respect dark mode on layout mount without flashing
  // Wait, I can just inject an inline script in the layout body or head via global layout, 
  // but it's simpler to just replace classes first.

  fs.writeFileSync(file, content);
});

console.log('Processed dark mode classes for layouts.');
