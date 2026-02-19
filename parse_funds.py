
import json
import re

raw_data = """
🟢 LOW RISK (334)
1. Mutual Fund (Shariah, Money Market) – 786 Islamic Money Market Fund
2. Mutual Fund (Shariah, Income) – 786 Smart Fund
3. VPS (Shariah, Debt) – ABL Islamic Pension Fund
4. VPS (Shariah, Money Market) – ABL GOKP Islamic Pension Fund
5. VPS (Shariah, Money Market) – ABL GOPB Islamic Pension Fund
6. VPS (Shariah, Money Market) – ABL Islamic Pension Fund
7. VPS (Debt) – ABL Pension Fund
8. VPS (Money Market) – ABL GOKP Pension Fund
9. VPS (Money Market) – ABL GOPB Pension Fund
10. VPS (Money Market) – ABL Pension Fund
11. Mutual Fund (Money Market) – ABL Cash Fund
12. Mutual Fund (Income) – ABL Financial Sector Fund Plan I
13. Mutual Fund (Income) – ABL Financial Sector Fund Plan I
14. Mutual Fund (Fixed Rate / Return) – ABL Fixed Rate Plan XIX
15. Mutual Fund (Fixed Rate / Return) – ABL Fixed Rate Plan XXI
16. Mutual Fund (Fixed Rate / Return) – ABL Fixed Rate Plan XXII
17. Mutual Fund (Fixed Rate / Return) – ABL Fixed Rate Plan XXIII
18. Mutual Fund (Fixed Rate / Return) – ABL Fixed Rate Plan XXIV
19. Mutual Fund (Income) – ABL Government Securities Fund
20. Mutual Fund (Income) – ABL Income Fund
21. Mutual Fund (Shariah, Money Market) – ABL Islamic Cash Fund
22. Mutual Fund (Shariah, Income) – ABL Islamic Income Fund
23. Mutual Fund (Shariah, Money Market) – ABL Islamic Money Market Plan I
24. Mutual Fund (Shariah, Income) – ABL Islamic Sovereign Plan I
25. Mutual Fund (Money Market) – ABL Money Market Plan I
26. Mutual Fund (Capital Protected) – ABL Special Saving Fund (ABL Special Saving Plan I)
27. Mutual Fund (Capital Protected) – ABL Special Saving Fund (ABL Special Saving Plan II)
28. Mutual Fund (Capital Protected) – ABL Special Saving Fund (ABL Special Saving Plan III)
29. Mutual Fund (Capital Protected) – ABL Special Saving Fund (ABL Special Saving Plan IV)
30. Mutual Fund (Capital Protected) – ABL Special Saving Fund (ABL Special Saving Plan V)
31. Mutual Fund (Capital Protected) – ABL Special Saving Fund (ABL Special Saving Plan VI)
32. Mutual Fund (Money Market) – AKD Cash Fund
33. Mutual Fund (Shariah, Money Market) – AKD Islamic Cash Fund
34. Mutual Fund (Shariah, Income) – AKD Islamic Income Fund
35. VPS (Shariah, Debt) – AL Habib Islamic Pension Fund
36. VPS (Shariah, Money Market) – AL Habib GOKP Islamic Pension Fund
37. VPS (Shariah, Money Market) – AL Habib Islamic Pension Fund
38. VPS (Debt) – AL Habib Pension Fund
39. VPS (Money Market) – AL Habib GOKP Pension Fund
40. VPS (Money Market) – AL Habib Pension Fund
41. Mutual Fund (Money Market) – AL Habib Cash Fund
42. Mutual Fund (Fixed Rate / Return) – AL Habib Fixed Return Fund Plan 19
43. Mutual Fund (Fixed Rate / Return) – AL Habib Fixed Return Fund Plan 20
44. Mutual Fund (Fixed Rate / Return) – AL Habib Fixed Return Fund Plan 22
45. Mutual Fund (Fixed Rate / Return) – AL Habib Fixed Return Fund Plan 23
46. Mutual Fund (Fixed Rate / Return) – AL Habib Fixed Return Fund Plan 24
47. Mutual Fund (Income) – AL Habib Government Securities Fund
48. Mutual Fund (Income) – AL Habib Income Fund
49. Mutual Fund (Shariah, Money Market) – AL Habib Islamic Cash Fund
50. Mutual Fund (Shariah, Income) – AL Habib Islamic Income Fund
51. Mutual Fund (Shariah, Income) – AL Habib Islamic Savings Fund
52. Mutual Fund (Money Market) – AL Habib Money Market Fund
53. Mutual Fund (Income) – AL Habib Sovereign Income Fund Plan 1
54. Mutual Fund (Income) – AL Habib Sovereign Income Fund Plan 2
55. Mutual Fund (Income) – AL Habib Sovereign Income Fund Plan 3
56. VPS (Shariah, Debt) – Meezan Tahaffuz Pension Fund
57. VPS (Shariah, Money Market) – Meezan GOKP Pension Fund
58. VPS (Shariah, Money Market) – Meezan Islamic Government of Punjab Pension Fund
59. VPS (Shariah, Money Market) – Meezan Tahaffuz Pension Fund
60. Mutual Fund (Shariah, Money Market) – Meezan Cash Fund
61. Mutual Fund (Shariah, Income) – Meezan Daily Income Fund (MDIP I)
62. Mutual Fund (Shariah, Income) – Meezan Daily Income Fund (Meezan Mahana Munafa Plan)
63. Mutual Fund (Shariah, Income) – Meezan Daily Income Fund (Meezan Munafa Plan I)
64. Mutual Fund (Shariah, Income) – Meezan Daily Income Fund (Meezan Sehl Account Plan) (MSHP)
65. Mutual Fund (Shariah, Income) – Meezan Daily Income Fund (Meezan Super Saver Plan) (MSSP)
66. Mutual Fund (Shariah, Money Market) – Meezan Islamic Asaan Cash Fund
67. Mutual Fund (Shariah, Income) – Meezan Islamic Income Fund
68. Mutual Fund (Shariah, Fixed Rate / Return) – Meezan Paidaar Munafa Plan 35
69. Mutual Fund (Shariah, Fixed Rate / Return) – Meezan Paidaar Munafa Plan 36
70. Mutual Fund (Shariah, Fixed Rate / Return) – Meezan Paidaar Munafa Plan 37
71. Mutual Fund (Shariah, Fixed Rate / Return) – Meezan Paidaar Munafa Plan XXXI
72. Mutual Fund (Shariah, Money Market) – Meezan Rozana Amdani Fund
73. Mutual Fund (Shariah, Income) – Meezan Sovereign Fund
74. VPS (Shariah, Debt) – Alfalah GHP Islamic Pension Fund
75. VPS (Shariah, Money Market) – Alfalah GHP Islamic Pension Fund
76. VPS (Shariah, Money Market) – Alfalah Islamic KPK Employee Pension Fund
77. VPS (Debt) – Alfalah GHP Pension Fund
78. VPS (Debt) – Alfalah Pension Fund - II
79. VPS (Money Market) – Alfalah GHP Pension Fund
80. VPS (Money Market) – Alfalah KPK Employee Pension Fund
81. VPS (Money Market) – Alfalah Pension Fund - II
82. Mutual Fund (Money Market) – Alfalah Cash Fund - II
83. Mutual Fund (Income) – Alfalah Financial Sector Income Fund
84. Mutual Fund (Income) – Alfalah Financial Sector Opportunity Fund
85. Mutual Fund (Money Market) – Alfalah GHP Cash Fund
86. Mutual Fund (Income) – Alfalah GHP Income Fund
87. Mutual Fund (Shariah, Income) – Alfalah GHP Islamic Income Fund
88. Mutual Fund (Money Market) – Alfalah GHP Money Market Fund
89. Mutual Fund (Income) – Alfalah GHP Sovereign Fund
90. Mutual Fund (Income) – Alfalah Government Securities Fund - II
91. Mutual Fund (Income) – Alfalah Government Securities Fund Plan I
92. Mutual Fund (Income) – Alfalah Government Securities Fund Plan II
93. Mutual Fund (Shariah, Money Market) – Alfalah Islamic Money Market Fund
94. Mutual Fund (Shariah, Money Market) – Alfalah Islamic Rozana Amdani Fund
95. Mutual Fund (Shariah, Income) – Alfalah Islamic Sovereign Fund (Alfalah Islamic Sovereign Plan I)
96. Mutual Fund (Shariah, Income) – Alfalah Islamic Sovereign Fund (Alfalah Islamic Sovereign Plan II)
97. Mutual Fund (Shariah, Income) – Alfalah Islamic Sovereign Fund (Alfalah Islamic Sovereign Plan III)
98. Mutual Fund (Shariah, Fixed Rate / Return) – Alfalah Islamic Stable Return Fund Plan  X
99. Mutual Fund (Shariah, Fixed Rate / Return) – Alfalah Islamic Stable Return Fund Plan XI
100. Mutual Fund (Shariah, Fixed Rate / Return) – Alfalah Islamic Stable Return Fund Plan XII
101. Mutual Fund (Money Market) – Alfalah Money Market Fund - II
102. Mutual Fund (Income) – Alfalah MTS Fund
103. Mutual Fund (Income) – Alfalah Savings Growth Fund
104. Mutual Fund (Capital Protected) – Alfalah Special Savings Fund - I
105. Mutual Fund (Capital Protected) – Alfalah Special Savings Fund - II
106. Mutual Fund (Fixed Rate / Return) – Alfalah Stable Return Fund Plan XX
107. Mutual Fund (Fixed Rate / Return) – Alfalah Stable Return Fund Plan XXI
108. Mutual Fund (Fixed Rate / Return) – Alfalah Stable Return Fund Plan XXII
109. Mutual Fund (Fixed Rate / Return) – Alfalah Stable Return Fund Plan XXIII
110. Mutual Fund (Fixed Rate / Return) – Alfalah Stable Return Fund Plan XXIV
111. Mutual Fund (Fixed Rate / Return) – Alfalah Stable Return Fund Plan XXVI
112. VPS (Shariah, Debt) – Atlas Pension Islamic Fund
113. VPS (Shariah, Money Market) – Atlas KPK Islamic Pension Fund
114. VPS (Shariah, Money Market) – Atlas Pension Islamic Fund
115. VPS (Shariah, Money Market) – Atlas Punjab Islamic Pension Fund
116. VPS (Debt) – Atlas Pension Fund
117. VPS (Money Market) – Atlas Pension Fund
118. VPS (Money Market) – Atlas Punjab Pension Fund
119. Mutual Fund (Income) – Atlas Income Fund
120. Mutual Fund (Shariah, Money Market) – Atlas Islamic Cash Fund
121. Mutual Fund (Shariah, Income) – Atlas Islamic Income Fund
122. Mutual Fund (Shariah, Money Market) – Atlas Islamic Money Market Fund
123. Mutual Fund (Money Market) – Atlas Liquid Fund
124. Mutual Fund (Money Market) – Atlas Money Market Fund
125. Mutual Fund (Income) – Atlas Sovereign Fund
126. VPS (Shariah, Debt) – AWT Islamic Pension Fund
127. VPS (Shariah, Money Market) – AWT Islamic Pension Fund
128. Mutual Fund (Income) – AWT Financial Sector Income Fund
129. Mutual Fund (Income) – AWT Income Fund
130. Mutual Fund (Shariah, Income) – AWT Islamic Income Fund
131. Mutual Fund (Shariah, Money Market) – AWT Islamic Money Market Fund
132. VPS (Shariah, Debt) – EFU Hemayah Pension Fund
133. VPS (Shariah, Money Market) – EFU Hemayah Pension Fund
134. VPS (Shariah, Debt) – Faysal Islamic Pension Fund
135. VPS (Shariah, Money Market) – Faysal Islamic KPK Government Pension Fund
136. VPS (Shariah, Money Market) – Faysal Islamic Pension Fund
137. VPS (Shariah, Money Market) – Faysal Islamic Punjab Pension Fund
138. Mutual Fund (Shariah, Money Market) – Faysal Halal Amdani Fund
139. Mutual Fund (Shariah, Income) – Faysal Halal Amdani Fund II
140. Mutual Fund (Shariah, Income) – Faysal Halal Amdani Fund III
141. Mutual Fund (Shariah, Money Market) – Faysal Islamic Cash Fund
142. Mutual Fund (Shariah, Fixed Rate / Return) – Faysal Islamic Mustakil Munafa Fund (Faysal Islamic Mehdood Muddat Plan I)
143. Mutual Fund (Shariah, Fixed Rate / Return) – Faysal Islamic Mustakil Munafa Fund (Faysal Islamic Mehdood Muddat Plan VI)
144. Mutual Fund (Shariah, Fixed Rate / Return) – Faysal Islamic Mustakil Munafa Fund (Faysal Islamic Mehdood Muddat Plan XIII)
145. Mutual Fund (Shariah, Fixed Rate / Return) – Faysal Islamic Mustakil Munafa Fund (Faysal Islamic Mehdood Muddat Plan XIV)
146. Mutual Fund (Shariah, Fixed Rate / Return) – Faysal Islamic Mustakil Munafa Fund (Faysal Islamic Mehdood Muddat Plan XV)
147. Mutual Fund (Shariah, Income) – Faysal Islamic Savings Growth Fund
148. Mutual Fund (Shariah, Income) – Faysal Islamic Sovereign Fund (Faysal Islamic Sovereign Plan I)
149. Mutual Fund (Shariah, Income) – Faysal Islamic Sovereign Fund (Faysal Islamic Sovereign Plan II)
150. Mutual Fund (Shariah, Income) – Faysal Islamic Special Income Plan I
151. VPS (Shariah, Debt) – HBL Islamic Pension Fund
152. VPS (Shariah, Money Market) – HBL Islamic Pension Fund
153. VPS (Shariah, Money Market) – HBL KPK Islamic Pension Fund
154. VPS (Debt) – HBL Pension Fund
155. VPS (Money Market) – HBL KPK Pension Fund
156. VPS (Money Market) – HBL Pension Fund
157. Mutual Fund (Money Market) – HBL Cash Fund
158. Mutual Fund (Income) – HBL Financial Sector Income Fund Plan I
159. Mutual Fund (Income) – HBL Financial Sector Income Fund Plan II
160. Mutual Fund (Income) – HBL Government Securities Fund
161. Mutual Fund (Income) – HBL Income Fund
162. Mutual Fund (Shariah, Fixed Rate / Return) – HBL Islamic Fixed Term Fund Plan II
163. Mutual Fund (Shariah, Income) – HBL Islamic Income Fund
164. Mutual Fund (Shariah, Money Market) – HBL Islamic Money Market Fund
165. Mutual Fund (Shariah, Money Market) – HBL Islamic Savings Plan I
166. Mutual Fund (Fixed Rate / Return) – HBL Mehfooz Munafa Fund Plan IV
167. Mutual Fund (Fixed Rate / Return) – HBL Mehfooz Munafa Fund Plan X
168. Mutual Fund (Fixed Rate / Return) – HBL Mehfooz Munafa Fund Plan XI
169. Mutual Fund (Fixed Rate / Return) – HBL Mehfooz Munafa Fund Plan XII
170. Mutual Fund (Fixed Rate / Return) – HBL Mehfooz Munafa Fund Plan XIII
171. Mutual Fund (Money Market) – HBL Money Market Fund
172. VPS (Shariah, Debt) – Mahaana IGI Islamic Retirement Fund
173. VPS (Shariah, Money Market) – Mahaana IGI Islamic Retirement Fund
174. VPS (Shariah, Debt) – JS Islamic Pension Savings Fund
175. VPS (Shariah, Money Market) – JS Islamic Pension Savings Fund
176. VPS (Shariah, Money Market) – JS KPK Islamic Pension Fund
177. VPS (Shariah, Money Market) – JS Punjab Islamic Pension Fund
178. VPS (Debt) – JS Pension Savings Fund
179. VPS (Money Market) – JS KPK Pension Fund
180. VPS (Money Market) – JS Pension Savings Fund
181. VPS (Money Market) – JS Punjab Pension Fund
182. Mutual Fund (Money Market) – JS Cash Fund
183. Mutual Fund (Fixed Rate / Return) – JS Fixed Term Munafa Fund (JS Fixed Term Munafa Plan I)
184. Mutual Fund (Fixed Rate / Return) – JS Fixed Term Munafa Fund (JS Fixed Term Munafa Plan XIV)
185. Mutual Fund (Fixed Rate / Return) – JS Fixed Term Munafa Fund (JS Fixed Term Munafa Plan XIX)
186. Mutual Fund (Fixed Rate / Return) – JS Fixed Term Munafa Fund (JS Fixed Term Munafa Plan XV)
187. Mutual Fund (Fixed Rate / Return) – JS Fixed Term Munafa Fund (JS Fixed Term Munafa Plan XVI)
188. Mutual Fund (Fixed Rate / Return) – JS Fixed Term Munafa Fund (JS Fixed Term Munafa Plan XX)
189. Mutual Fund (Fixed Rate / Return) – JS Fixed Term Munafa Fund (JS Fixed Term Munafa Plan XXI)
190. Mutual Fund (Fixed Rate / Return) – JS Fixed Term Munafa Fund II (JS Fixed Term Munafa Plan I)
191. Mutual Fund (Fixed Rate / Return) – JS Fixed Term Munafa Fund II (JS Fixed Term Munafa Plan IV)
192. Mutual Fund (Fixed Rate / Return) – JS Fixed Term Munafa Fund II (JS Fixed Term Munafa Plan V)
193. Mutual Fund (Fixed Rate / Return) – JS Fixed Term Munafa Fund II (JS Fixed Term Munafa Plan VI)
194. Mutual Fund (Income) – JS Government Securities Fund
195. Mutual Fund (Income) – JS Income Fund
196. Mutual Fund (Shariah, Income) – JS Islamic Income Fund
197. Mutual Fund (Shariah, Money Market) – JS Islamic Money Market Fund
198. Mutual Fund (Shariah, Capital Protected) – JS Islamic Sarmaya Mehfooz Fund (JS Islamic Sarmaya Mehfooz Plan 1)
199. Mutual Fund (Shariah, Capital Protected) – JS Islamic Sarmaya Mehfooz Fund Plan 2 2020
200. Mutual Fund (Income) – JS Microfinance Sector Fund
201. Mutual Fund (Money Market) – JS Money Market Fund
202. Mutual Fund (Income) – Lakson Income Fund
203. Mutual Fund (Shariah, Money Market) – Lakson Islamic Money Market Fund
204. Mutual Fund (Money Market) – Lakson Money Market Fund
205. VPS (Shariah, Debt) – Lucky Islamic Pension Fund
206. VPS (Shariah, Money Market) – Lucky Islamic Pension Fund
207. VPS (Shariah, Money Market) – Lucky Islamic Punjab Pension Fund
208. Mutual Fund (Shariah, Money Market) – Lucky Islamic Cash Fund
209. Mutual Fund (Shariah, Fixed Rate / Return) – Lucky Islamic Fixed Term Fund Plan IX
210. Mutual Fund (Shariah, Fixed Rate / Return) – Lucky Islamic Fixed Term Fund Plan V
211. Mutual Fund (Shariah, Fixed Rate / Return) – Lucky Islamic Fixed Term Fund Plan VII
212. Mutual Fund (Shariah, Fixed Rate / Return) – Lucky Islamic Fixed Term Fund Plan XII
213. Mutual Fund (Shariah, Income) – Lucky Islamic Income Fund
214. Mutual Fund (Shariah, Money Market) – Lucky Islamic Money Market Fund
215. Mutual Fund (Shariah, Money Market) – Mahaana Islamic Cash Fund
216. VPS (Shariah, Debt) – Alhamra Islamic Pension Fund
217. VPS (Shariah, Money Market) – Alhamra Islamic Pension Fund
218. VPS (Shariah, Money Market) – Alhamra Islamic Punjab Pension Fund
219. VPS (Shariah, Money Market) – MCB Alhamra KPK Govt Employees Pension Fund
220. VPS (Debt) – Pakistan Pension Fund
221. VPS (Money Market) – MCB KPK Govt Employees Pension Fund
222. VPS (Money Market) – MCB Punjab Pension Fund
223. VPS (Money Market) – Pakistan Pension Fund
224. Mutual Fund (Shariah, Money Market) – Alhamra Cash Management Optimizer
225. Mutual Fund (Shariah, Income) – Alhamra Daily Dividend Fund
226. Mutual Fund (Shariah, Income) – Alhamra Government Securities Plan I
227. Mutual Fund (Shariah, Income) – Alhamra Islamic Income Fund
228. Mutual Fund (Shariah, Money Market) – Alhamra Islamic Money Market Fund
229. Mutual Fund (Shariah, Fixed Rate / Return) – Alhamra Wada Fund (Alhamra Wada Plan XVI)
230. Mutual Fund (Money Market) – MCB Cash Management Optimizer
231. Mutual Fund (Fixed Rate / Return) – MCB DCF Fixed Return III (Plan IV)
232. Mutual Fund (Income) – MCB DCF Income Fund
233. Mutual Fund (Income) – MCB Government Securities Plan I
234. Mutual Fund (Fixed Rate / Return) – MCB Pakistan Fixed Return Plan 25
235. Mutual Fund (Income) – MCB Pakistan Sovereign Fund
236. Mutual Fund (Money Market) – Pakistan Cash Management Fund
237. Mutual Fund (Income) – Pakistan Income Fund
238. VPS (Shariah, Debt) – NIT Islamic Pension Fund
239. VPS (Shariah, Money Market) – NIT Islamic Pension Fund
240. VPS (Shariah, Money Market) – NIT KP Islamic Pension Fund
241. VPS (Debt) – NIT Pension Fund
242. VPS (Money Market) – NIT KP Pension Fund
243. VPS (Money Market) – NIT Pension Fund
244. Mutual Fund (Income) – NIT - Government Bond Fund
245. Mutual Fund (Income) – NIT - Income Fund
246. Mutual Fund (Shariah, Income) – NIT Islamic Income Fund
247. Mutual Fund (Shariah, Money Market) – NIT Islamic Money Market Fund
248. Mutual Fund (Money Market) – NIT Money Market Fund
249. Mutual Fund (Income) – NIT Social Impact Fund
250. VPS (Shariah, Debt) – NAFA Islamic Pension Fund
251. VPS (Shariah, Money Market) – NAFA Islamic Pension Fund
252. VPS (Shariah, Money Market) – NBP GoKP Islamic Pension Fund
253. VPS (Shariah, Money Market) – NBP Islamic Punjab Pension Fund
254. VPS (Debt) – NAFA Pension Fund
255. VPS (Money Market) – NAFA Pension Fund
256. VPS (Money Market) – NBP GoKP Pension Fund
257. VPS (Money Market) – NBP Punjab Pension Fund
258. Mutual Fund (Money Market) – NBP Cash Plan I
259. Mutual Fund (Money Market) – NBP Cash Plan II
260. Mutual Fund (Income) – NBP Financial Sector Income Fund
261. Mutual Fund (Fixed Rate / Return) – NBP Fixed Term Munafa Plan XIIA (NBP Mustahkam Fund II)
262. Mutual Fund (Fixed Rate / Return) – NBP Fixed Term Munafa Plan XIII (NBP Mustahkam Fund II)
263. Mutual Fund (Fixed Rate / Return) – NBP Fixed Term Munafa Plan XIVA (NBP Mustahkam Fund II)
264. Mutual Fund (Fixed Rate / Return) – NBP Fixed Term Munafa Plan XIX
265. Mutual Fund (Fixed Rate / Return) – NBP Fixed Term Munafa Plan XIXA (NBP Mustahkam Fund II)
266. Mutual Fund (Fixed Rate / Return) – NBP Fixed Term Munafa Plan XVIA (NBP Mustahkam Fund II)
267. Mutual Fund (Fixed Rate / Return) – NBP Fixed Term Munafa Plan XVIIA (NBP Mustahkam Fund II)
268. Mutual Fund (Fixed Rate / Return) – NBP Fixed Term Munafa Plan XVIIIA (NBP Mustahkam Fund II)
269. Mutual Fund (Money Market) – NBP Government Securities Liquid Fund
270. Mutual Fund (Income) – NBP Government Securities Plan IV
271. Mutual Fund (Income) – NBP Government Securities Plan VIII
272. Mutual Fund (Income) – NBP Government Securities Savings Fund
273. Mutual Fund (Income) – NBP Income Opportunity Fund
274. Mutual Fund (Income) – NBP Income Plan I
275. Mutual Fund (Shariah, Money Market) – NBP Islamic Daily Dividend Fund
276. Mutual Fund (Shariah, Fixed Rate / Return) – NBP Islamic Fixed Term Munafa Plan IIA (NBP Islamic Mustahkam Fund)
277. Mutual Fund (Shariah, Fixed Rate / Return) – NBP Islamic Fixed Term Munafa Plan IIIA (NBP Islamic Mustahkam Fund)
278. Mutual Fund (Shariah, Fixed Rate / Return) – NBP Islamic Fixed Term Munafa Plan IVA (NBP Islamic Mustahkam Fund)
279. Mutual Fund (Shariah, Fixed Rate / Return) – NBP Islamic Fixed Term Munafa Plan VIII (NBP Islamic Mustahkam Fund)
280. Mutual Fund (Shariah, Income) – NBP Islamic Government Securities Plan III
281. Mutual Fund (Shariah, Income) – NBP Islamic Income Fund
282. Mutual Fund (Shariah, Income) – NBP Islamic Mahana Amdani Fund
283. Mutual Fund (Shariah, Money Market) – NBP Islamic Money Market Fund
284. Mutual Fund (Shariah, Capital Protected) – NBP Islamic Principal Protection Fund I (NBP Islamic Principal Protection Plan I)
285. Mutual Fund (Shariah, Capital Protected) – NBP Islamic Principal Protection Fund II (NBP Islamic Principal Protection Fund I)
286. Mutual Fund (Shariah, Capital Protected) – NBP Islamic Principal Protection Fund III (NBP Islamic Principal Protection Plan I)
287. Mutual Fund (Shariah, Income) – NBP Islamic Savings Fund
288. Mutual Fund (Income) – NBP Mahana Amdani Fund
289. Mutual Fund (Money Market) – NBP Money Market Fund
290. Mutual Fund (Shariah, Income) – NBP Riba Free Savings Fund
291. Mutual Fund (Income) – NBP Savings Fund
292. Mutual Fund (Money Market) – Askari Cash Fund
293. Mutual Fund (Income) – Askari Sovereign Yield Enhancer
294. Mutual Fund (Shariah, Income) – Pak Oman Advantage Islamic Income Fund
295. Mutual Fund (Shariah, Money Market) – Pak Oman Daily Dividend Fund
296. Mutual Fund (Income) – Pak Oman Income Fund
297. Mutual Fund (Income) – Pak Oman Micro Finance Fund
298. Mutual Fund (Shariah, Money Market) – Pak Qatar Asan Munafa Plan
299. Mutual Fund (Shariah, Money Market) – Pak Qatar Cash Plan
300. Mutual Fund (Shariah, Money Market) – Pak Qatar Daily Dividend Plan
301. Mutual Fund (Shariah, Income) – Pak Qatar Income Plan
302. Mutual Fund (Shariah, Income) – Pak Qatar Khalis Bachat Plan
303. Mutual Fund (Shariah, Income) – Pak Qatar Monthly Income Plan
304. VPS (Shariah, Debt) – Pak Qatar Islamic Pension Fund
305. VPS (Shariah, Money Market) – Pak Qatar GoKP Islamic Pension Fund
306. VPS (Shariah, Money Market) – Pak Qatar GoPB Islamic Pension Fund
307. VPS (Shariah, Money Market) – Pak Qatar Islamic Pension Fund
308. VPS (Shariah, Debt) – Al Ameen Islamic Retirement Savings Fund
309. VPS (Shariah, Money Market) – Al Ameen Islamic Punjab Pension Fund
310. VPS (Shariah, Money Market) – Al Ameen Islamic Retirement Savings Fund
311. VPS (Shariah, Money Market) – Al Ameen Voluntary Pension Fund KPK
312. VPS (Debt) – UBL Retirement Saving Fund
313. VPS (Money Market) – UBL Punjab Pension Fund
314. VPS (Money Market) – UBL Retirement Saving Fund
315. VPS (Money Market) – UBL Voluntary Pension Fund KPK
316. Mutual Fund (Shariah, Money Market) – Al Ameen Islamic Cash Fund
317. Mutual Fund (Shariah, Money Market) – Al Ameen Islamic Cash Plan I
318. Mutual Fund (Shariah, Income) – Al Ameen Islamic Income Fund
319. Mutual Fund (Shariah, Income) – Al Ameen Islamic Sovereign Fund
320. Mutual Fund (Money Market) – UBL Cash Fund
321. Mutual Fund (Fixed Rate / Return) – UBL Fixed Return Plan II (AB)
322. Mutual Fund (Fixed Rate / Return) – UBL Fixed Return Plan II (M)
323. Mutual Fund (Fixed Rate / Return) – UBL Fixed Return Plan III (X)
324. Mutual Fund (Fixed Rate / Return) – UBL Fixed Return Plan III (Y)
325. Mutual Fund (Fixed Rate / Return) – UBL Fixed Return Plan III (Z)
326. Mutual Fund (Fixed Rate / Return) – UBL Fixed Return Plan IV (G)
327. Mutual Fund (Fixed Rate / Return) – UBL Fixed Return Plan IV (M)
328. Mutual Fund (Fixed Rate / Return) – UBL Fixed Return Plan IV (O)
329. Mutual Fund (Income) – UBL Government Securities Fund
330. Mutual Fund (Income) – UBL Income Opportunity Fund
331. Mutual Fund (Money Market) – UBL Liquidity Fund
332. Mutual Fund (Money Market) – UBL Liquidity Plus Fund
333. Mutual Fund (Money Market) – UBL Money Market Fund
334. Mutual Fund (Capital Protected - Income) – UBL Special Savings Plan V
335. Mutual Fund (Capital Protected - Income) – UBL Special Savings Plan X

🟡 MEDIUM RISK (85)
336. Mutual Fund (Fund of Funds) – ABL Financial Planning Fund (Conservative Plan)
337. Mutual Fund (Fund of Funds) – ABL Financial Planning Fund (Strategic Allocation Plan)
338. Mutual Fund (Shariah, Asset Allocation) – ABL Islamic Asset Allocation Fund
339. Mutual Fund (Shariah, Fund of Funds) – ABL Islamic Financial Planning Fund (Active Allocation Plan)
340. Mutual Fund (Shariah, Fund of Funds - CPPI) – ABL Islamic Financial Planning Fund (Capital Preservation Plan I)
341. Mutual Fund (Shariah, Fund of Funds) – ABL Islamic Financial Planning Fund (Conservative Allocation Plan)
342. Mutual Fund (Asset Allocation) – ABL Optimal Asset Allocation Fund
343. Mutual Fund (Asset Allocation) – Allied Finergy Fund
344. Mutual Fund (Aggressive Fixed Income) – AKD Aggressive Income Fund
345. Mutual Fund (Asset Allocation) – AL Habib Asset Allocation Fund
346. Mutual Fund (Shariah, Asset Allocation) – Meezan Asset Allocation Fund
347. Mutual Fund (Shariah, Balanced) – Meezan Balanced Fund
348. Mutual Fund (Shariah, Asset Allocation) – Meezan Dynamic Asset Allocation Fund (Meezan Dividend Yield Plan)
349. Mutual Fund (Shariah, Fund of Funds) – Meezan Financial Planning Fund of Funds (Aggressive)
350. Mutual Fund (Shariah, Fund of Funds) – Meezan Financial Planning Fund of Funds (Conservative)
351. Mutual Fund (Shariah, Fund of Funds) – Meezan Financial Planning Fund of Funds (MAAP I)
352. Mutual Fund (Shariah, Fund of Funds) – Meezan Financial Planning Fund of Funds (Moderate)
353. Mutual Fund (Shariah, Fund of Funds) – Meezan Financial Planning Fund of Funds (Very Conservative Allocation Plan)
354. Mutual Fund (Shariah, Fund of Funds) – Meezan Strategic Allocation Fund (MSAP I)
355. Mutual Fund (Shariah, Fund of Funds) – Meezan Strategic Allocation Fund (MSAP II)
356. Mutual Fund (Shariah, Fund of Funds) – Meezan Strategic Allocation Fund (MSAP III)
357. Mutual Fund (Shariah, Fund of Funds) – Meezan Strategic Allocation Fund (MSAP IV)
358. Mutual Fund (Shariah, Fund of Funds) – Meezan Strategic Allocation Fund (MSAP V)
359. Mutual Fund (Asset Allocation) – Alfalah Asset Allocation Fund
360. Mutual Fund (Asset Allocation) – Alfalah Financial Value Fund (Alfalah Financial Value Plan I)
361. Mutual Fund (Asset Allocation) – Alfalah Financial Value Fund - II
362. Mutual Fund (Aggressive Fixed Income) – Alfalah GHP Income Multiplier Fund
363. Mutual Fund (Shariah, Fund of Funds) – Alfalah GHP Islamic Prosperity Planning Fund (Alfalah GHP Islamic Active Allocation Plan II)
364. Mutual Fund (Shariah, Fund of Funds) – Alfalah GHP Islamic Prosperity Planning Fund (Alfalah GHP Islamic Balance Allocation Plan)
365. Mutual Fund (Shariah, Fund of Funds) – Alfalah GHP Islamic Prosperity Planning Fund (Alfalah GHP Islamic Moderate Allocation Plan)
366. Mutual Fund (Shariah, Asset Allocation) – Alfalah GHP Islamic Value Fund
367. Mutual Fund (Fund of Funds) – Alfalah GHP Prosperity Planning Fund (Alfalah GHP Active Allocation Plan)
368. Mutual Fund (Fund of Funds) – Alfalah GHP Prosperity Planning Fund (Alfalah GHP Conservative Allocation Plan)
369. Mutual Fund (Fund of Funds) – Alfalah GHP Prosperity Planning Fund (Alfalah GHP Moderate Allocation Plan)
370. Mutual Fund (Fund of Funds) – Alfalah GHP Prosperity Planning Fund (Capital Preservation Plan IV)
371. Mutual Fund (Asset Allocation) – Alfalah GHP Value Fund
372. Mutual Fund (Aggressive Fixed Income) – Alfalah Income & Growth Fund
373. Mutual Fund (Shariah, Fund of Funds) – Alfalah KTrade Islamic Plan VII
374. Mutual Fund (Fund of Funds) – Alfalah Strategic Allocation Fund Plan - I
375. Mutual Fund (Shariah, Fund of Funds) – Atlas Islamic Fund of Funds (Atlas Aggressive Allocation Islamic Plan)
376. Mutual Fund (Shariah, Fund of Funds) – Atlas Islamic Fund of Funds (Atlas Conservative Allocation Islamic Plan)
377. Mutual Fund (Shariah, Fund of Funds) – Atlas Islamic Fund of Funds (Atlas Moderate Allocation Islamic Plan)
378. Mutual Fund (Shariah, Asset Allocation) – AWT Islamic Asset Allocation Fund
379. Mutual Fund (Shariah, Asset Allocation) – Faysal Islamic Asset Allocation Fund
380. Mutual Fund (Shariah, Asset Allocation) – Faysal Islamic Asset Allocation Fund II
381. Mutual Fund (Shariah, Asset Allocation) – Faysal Islamic Asset Allocation Fund III (Faysal Shariah Flex Plan I)
382. Mutual Fund (Shariah, Asset Allocation) – Faysal Islamic Asset Allocation Fund III (Faysal Shariah Flex Plan II)
383. Mutual Fund (Shariah, Asset Allocation) – Faysal Islamic Asset Allocation Fund III (Faysal Shariah Flex Plan III)
384. Mutual Fund (Shariah, Aggressive Fixed Income) – Faysal Islamic Financial Growth Fund (Faysal Islamic Financial Growth Plan I)
385. Mutual Fund (Shariah, Aggressive Fixed Income) – Faysal Islamic Financial Growth Fund (Faysal Islamic Financial Growth Plan II)
386. Mutual Fund (Shariah, Aggressive Fixed Income) – Faysal Islamic Financial Growth Fund II
387. Mutual Fund (Shariah, Fund of Funds) – Faysal Islamic Financial Planning Fund II (Faysal Priority Ascend Plan I)
388. Mutual Fund (Shariah, Fund of Funds) – Faysal Islamic Financial Planning Fund II (Faysal Priority Ascend Plan II)
389. Mutual Fund (Shariah, Fund of Funds) – Faysal Islamic Financial Planning Fund II (Faysal Priority Ascend Plan III)
390. Mutual Fund (Shariah, Fund of Funds) – Faysal Khushal Mustaqbil Fund (Faysal Barak’ah Women Savers Plan)
391. Mutual Fund (Shariah, Fund of Funds) – Faysal Khushal Mustaqbil Fund (Faysal Nu’umah Women Savers Plan)
392. Mutual Fund (Shariah, Asset Allocation) – HBL Islamic Asset Allocation Fund
393. Mutual Fund (Balanced) – HBL Multi Asset Fund
394. Mutual Fund (Fund of Funds) – JS Fund of Funds
395. Mutual Fund (Balanced) – Unit Trust of Pakistan
396. Mutual Fund (Asset Allocation) – Lakson Asset Allocation Developed Markets Fund
397. Mutual Fund (Shariah, Asset Allocation) – Lakson Islamic Tactical Fund
398. Mutual Fund (Asset Allocation) – Lakson Tactical Fund
399. Mutual Fund (Shariah, Asset Allocation) – Alhamra Islamic Asset Allocation Fund
400. Mutual Fund (Shariah, Fund of Funds) – Alhamra Smart Portfolio
401. Mutual Fund (Aggressive Fixed Income) – MCB Investment Savings Plan I
402. Mutual Fund (Asset Allocation) – MCB Pakistan Asset Allocation Fund
403. Mutual Fund (Asset Allocation) – MCB Pakistan Opportunity Fund (MCB Pakistan  Dividend Yield Plan)
404. Mutual Fund (Balanced) – Pakistan Capital Market Fund
405. Mutual Fund (Aggressive Fixed Income) – Pakistan Income Enhancement Fund
406. Mutual Fund (Asset Allocation) – NIT Asset Allocation Fund
407. Mutual Fund (Balanced) – NBP Balanced Fund
408. Mutual Fund (Shariah, Asset Allocation) – NBP Islamic Sarmaya Izafa Fund
409. Mutual Fund (Asset Allocation) – NBP Sarmaya Izafa Fund
410. Mutual Fund (Aggressive Fixed Income) – Askari High Yield Scheme
411. Mutual Fund (Asset Allocation) – Pak Oman Advantage Asset Allocation Fund
412. Mutual Fund (Shariah, Asset Allocation) – Pak Oman Islamic Asset Allocation Fund
413. Mutual Fund (Shariah, Asset Allocation) – Pak Qatar Asset Allocation Plan I (PQAAP  IA)
414. Mutual Fund (Shariah, Asset Allocation) – Pak Qatar Asset Allocation Plan II (PQAAP  IIA)
415. Mutual Fund (Shariah, Asset Allocation) – Pak-Qatar Asset Allocation Plan III (PQAAP  IIIA)
416. Mutual Fund (Shariah, Aggressive Fixed Income) – Al Ameen Islamic Aggressive Income Fund
417. Mutual Fund (Shariah, Aggressive Fixed Income) – Al Ameen Islamic Aggressive Income Plan I
418. Mutual Fund (Shariah, Asset Allocation) – Al Ameen Islamic Asset Allocation Fund
419. Mutual Fund (Asset Allocation) – UBL Asset Allocation Fund
420. Mutual Fund (Aggressive Fixed Income) – UBL Growth & Income Fund

🔴 HIGH RISK (100)
421. VPS (Shariah, Equity) – ABL Islamic Pension Fund
422. VPS (Equity) – ABL Pension Fund
423. Mutual Fund (Shariah, Dedicated Equity) – ABL Islamic Dedicated Stock Fund
424. Mutual Fund (Shariah, Equity) – ABL Islamic Stock Fund
425. Mutual Fund (Equity) – ABL Stock Fund
426. Mutual Fund (Index Tracker) – AKD Index Tracker Fund
427. Mutual Fund (Shariah, Equity) – AKD Islamic Stock Fund
428. Mutual Fund (Equity) – AKD Opportunity Fund
429. Mutual Fund (Equity) – Golden Arrow Stock Fund
430. VPS (Shariah, Equity) – AL Habib Islamic Pension Fund
431. VPS (Equity) – AL Habib Pension Fund
432. Mutual Fund (Shariah, Equity) – AL Habib Islamic Stock Fund
433. Mutual Fund (Equity) – AL Habib Stock Fund
434. VPS (Shariah, Equity) – Meezan Tahaffuz Pension Fund
435. Mutual Fund (Shariah, Equity) – Al Meezan Mutual Fund
436. Mutual Fund (Shariah, Index Tracker) – KSE Meezan Index Fund
437. Mutual Fund (Shariah, Dedicated Equity) – Meezan Dedicated Equity Fund
438. Mutual Fund (Shariah, Equity) – Meezan Energy Fund
439. Mutual Fund (Shariah, Commodities) – Meezan Gold Fund
440. Mutual Fund (Shariah, Equity) – Meezan Islamic Fund
441. Mutual Fund (Shariah, Exchange Traded Fund) – Meezan Pakistan ETF
442. VPS (Shariah, Commodities / Gold) – Meezan Tahaffuz Pension Fund
443. VPS (Shariah, Equity) – Alfalah GHP Islamic Pension Fund
444. VPS (Equity) – Alfalah GHP Pension Fund
445. VPS (Equity) – Alfalah Pension Fund - II
446. Mutual Fund (Exchange Traded Fund) – Alfalah Consumer Index Exchange Traded Fund
447. Mutual Fund (Equity) – Alfalah GHP Alpha Fund
448. Mutual Fund (Dedicated Equity) – Alfalah GHP Dedicated Equity Fund
449. Mutual Fund (Shariah, Dedicated Equity) – Alfalah GHP Islamic Dedicated Equity Fund
450. Mutual Fund (Shariah, Equity) – Alfalah GHP Islamic Stock Fund
451. Mutual Fund (Equity) – Alfalah GHP Stock Fund
452. Mutual Fund (Equity) – Alfalah Stock Fund - II
453. VPS (Shariah, Equity) – Atlas Pension Islamic Fund
454. VPS (Equity) – Atlas Pension Fund
455. Mutual Fund (Equity) – Atlas Dividend Yield Fund
456. Mutual Fund (Equity) – Atlas Financial Sector Fund
457. Mutual Fund (Shariah, Dedicated Equity) – Atlas Islamic Dedicated Stock Fund
458. Mutual Fund (Shariah, Equity) – Atlas Islamic Stock Fund
459. Mutual Fund (Equity) – Atlas Stock Market Fund
460. VPS (Shariah, Equity) – AWT Islamic Pension Fund
461. Mutual Fund (Shariah, Equity) – AWT Islamic Stock Fund
462. VPS (Shariah, Equity) – EFU Hemayah Pension Fund
463. VPS (Shariah, Equity) – Faysal Islamic Pension Fund
464. Mutual Fund (Shariah, Dedicated Equity) – Faysal Islamic Dedicated Equity Fund
465. Mutual Fund (Shariah, Equity) – Faysal Islamic Stock Fund
466. Mutual Fund (Shariah, Equity) – Faysal Islamic Stock Fund II
467. Mutual Fund (Equity) – First Capital Mutual Fund
468. VPS (Shariah, Equity) – HBL Islamic Pension Fund
469. VPS (Equity) – HBL Pension Fund
470. Mutual Fund (Equity) – HBL Energy Fund
471. Mutual Fund (Equity) – HBL Equity Fund
472. Mutual Fund (Equity) – HBL Growth Fund-Class A
473. Mutual Fund (Equity) – HBL Growth Fund-Class B
474. Mutual Fund (Equity) – HBL Investment Fund-Class A
475. Mutual Fund (Equity) – HBL Investment Fund-Class B
476. Mutual Fund (Shariah, Equity) – HBL Islamic Equity Fund
477. Mutual Fund (Shariah, Equity) – HBL Islamic Stock Fund
478. Mutual Fund (Equity) – HBL Stock Fund
479. Mutual Fund (Exchange Traded Fund) – HBL Total Treasury Exchange Traded Fund
480. VPS (Shariah, Equity) – Mahaana IGI Islamic Retirement Fund
481. VPS (Shariah, Equity) – JS Islamic Pension Savings Fund
482. VPS (Equity) – JS Pension Savings Fund
483. Mutual Fund (Equity) – JS Growth Fund
484. Mutual Fund (Shariah, Equity) – JS Islamic Fund
485. Mutual Fund (Equity) – JS Large Cap Fund
486. Mutual Fund (Exchange Traded Fund) – JS Momentum Factor Exchange Traded Fund
487. Mutual Fund (Equity) – Lakson Equity Fund
488. VPS (Shariah, Equity) – Lucky Islamic Pension Fund
489. Mutual Fund (Shariah, Equity) – Lucky Islamic Energy Fund
490. VPS (Shariah, Commodities / Gold) – Lucky Islamic Pension Fund
491. Mutual Fund (Shariah, Equity) – Lucky Islamic Stock Fund
492. Mutual Fund (Shariah, Exchange Traded Fund) – Mahaana Islamic Index Exchange Traded Fund
493. VPS (Shariah, Equity) – Alhamra Islamic Pension Fund
494. VPS (Equity) – Pakistan Pension Fund
495. Mutual Fund (Shariah, Equity) – Alhamra Islamic Stock Fund
496. Mutual Fund (Shariah, Equity) – Alhamra Opportunity Fund (Dividend Strategy Plan)
497. Mutual Fund (Equity) – MCB Pakistan Stock Market Fund
498. VPS (Shariah, Equity) – NIT Islamic Pension Fund
499. VPS (Equity) – NIT Pension Fund
500. Mutual Fund (Equity) – National Investment Unit Trust
501. Mutual Fund (Shariah, Equity) – NIT Islamic Equity Fund
502. Mutual Fund (Exchange Traded Fund) – NIT Pakistan Gateway Exchange Traded Fund
503. VPS (Commodities / Gold) – NIT Pension Fund
504. VPS (Shariah, Equity) – NAFA Islamic Pension Fund
505. VPS (Equity) – NAFA Pension Fund
506. Mutual Fund (Equity) – NBP Financial Sector Fund
507. Mutual Fund (Shariah, Equity) – NBP Islamic Energy Fund
508. Mutual Fund (Shariah, Equity) – NBP Islamic Stock Fund
509. Mutual Fund (Exchange Traded Fund) – NBP Pakistan Growth Exchange Traded Fund
510. Mutual Fund (Equity) – NBP Stock Fund
511. Mutual Fund (Shariah, Equity) – Pak Qatar Islamic Stock Fund
512. VPS (Shariah, Equity) – Pak Qatar Islamic Pension Fund
513. VPS (Shariah, Equity) – Al Ameen Islamic Retirement Savings Fund
514. VPS (Equity) – UBL Retirement Saving Fund
515. Mutual Fund (Shariah, Equity) – Al Ameen Islamic Energy Fund
516. Mutual Fund (Shariah, Equity) – Al Ameen Shariah Stock Fund
517. Mutual Fund (Equity) – UBL Financial Sector Fund
518. Mutual Fund (Exchange Traded Fund) – UBL Pakistan Enterprise Exchange Traded Fund
519. VPS (Commodities / Gold) – UBL Retirement Saving Fund
520. Mutual Fund (Equity) – UBL Stock Advantage Fund
"""

amc_map = {
    '786 Investments Limited': ['786'],
    'ABL Asset Management Company Limited': ['ABL', 'Allied'],
    'AKD Investment Management Limited': ['AKD', 'Golden Arrow'],
    'AL Habib Asset Management Limited': ['AL Habib'],
    'Al Meezan Investment Management Limited': ['Meezan', 'Al Meezan'],
    'Alfalah Asset Management Limited': ['Alfalah'],
    'Atlas Asset Management Limited': ['Atlas'],
    'AWT Investments Limited': ['AWT'],
    'EFU Life Assurance Ltd': ['EFU'], 
    'Faysal Asset Management Limited': ['Faysal'],
    'First Capital Investments Limited': ['First Capital'],
    'HBL Asset Management Limited': ['HBL'],
    'JS Investments Limited': ['JS', 'Unit Trust of Pakistan'],
    'Lakson Investments Limited': ['Lakson'],
    'Lucky Investments Limited': ['Lucky'],
    'Mahaana Wealth Limited': ['Mahaana'],
    'MCB Investment Management Limited': ['MCB', 'Alhamra', 'Pakistan Pension', 'Pakistan Capital', 'Pakistan Income', 'Pakistan Cash'],
    'National Investment Trust Limited (NIT)': ['NIT', 'National Investment'],
    'NBP Fund Management Limited': ['NBP', 'NAFA'],
    'Pak Oman Asset Management Company Limited': ['Pak Oman', 'Askari'],
    'Pak-Qatar Asset Management Company Limited': ['Pak Qatar', 'Pak-Qatar'],
    'UBL Fund Managers Limited': ['UBL', 'Al Ameen']
}

lines = raw_data.strip().split('\n')
current_risk = None
funds = {}

for line in lines:
    line = line.strip()
    if not line: continue
    
    if "LOW RISK" in line:
        current_risk = "LOW"
        continue
    elif "MEDIUM RISK" in line:
        current_risk = "MEDIUM"
        continue
    elif "HIGH RISK" in line:
        current_risk = "HIGH"
        continue
        
    match = re.match(r'^\d+\.\s+(.*?)\s+[–-]\s+(.*)', line)
    if not match:
        parts = re.split(r'\s+[–-]\s+', line, maxsplit=1)
        if len(parts) == 2:
            type_part = re.sub(r'^\d+\.\s+', '', parts[0])
            name_part = parts[1]
        else:
            continue
    else:
        type_part = match.group(1)
        name_part = match.group(2)
        
    is_shariah = "Shariah" in type_part or "Islamic" in name_part or "Meezan" in name_part or "Alhamra" in name_part or "Al Ameen" in name_part
    category = "VPS" if "VPS" in type_part else "MUTUAL_FUND"
    
    found_amc = "Other"
    for amc_name, keywords in amc_map.items():
        for kw in keywords:
            if kw in name_part:
                found_amc = amc_name
                break
        if found_amc != "Other": break
        
    if found_amc not in funds:
        funds[found_amc] = []
        
    funds[found_amc].append({
        "name": name_part,
        "risk": current_risk,
        "isShariah": is_shariah,
        "category": category
    })

with open("src/constants/fundsData.ts", "w", encoding='utf-8') as f:
    f.write("export interface FundDetails {\n")
    f.write("    name: string;\n")
    f.write("    risk: 'LOW' | 'MEDIUM' | 'HIGH';\n")
    f.write("    isShariah: boolean;\n")
    f.write("    category: 'MUTUAL_FUND' | 'VPS';\n")
    f.write("}\n")
    f.write("\n")
    f.write("export const FUNDS_DATA: Record<string, FundDetails[]> = {\n")
    for amc, fund_list in funds.items():
        f.write(f"    '{amc}': [\n")
        for fund in fund_list:
            f.write(f"        {{ name: \"{fund['name']}\", risk: '{fund['risk']}', isShariah: {str(fund['isShariah']).lower()}, category: '{fund['category']}' }},\n")
        f.write("    ],\n")
    f.write("};\n")
