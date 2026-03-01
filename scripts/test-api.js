(async () => {
   const res = await fetch("http://localhost:3000/api/products/count?categoryId=695c543a45174e8dd3273ffc");
   const data = await res.json();
   console.log("Count with categoryId:", data);
   
   const res2 = await fetch("http://localhost:3000/api/categories");
   const data2 = await res2.json();
   console.log("Total cats:", data2.categories.length);
})();
