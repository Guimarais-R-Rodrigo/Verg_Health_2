// Invented from scratch: no clinical document, patient or blocked implementation used.
export function inventedRecord(recordId, overrides = {}) {
  return {recordId,snapshotId:`invented-${recordId}-v1`,biomarkerCode:'DEMO-A',biomarkerName:'Marcador inventado',collectionDate:'2040-01-01',valueRaw:'0',valueNumeric:0,resultType:'exact',comparator:null,unit:'u-demo',refText:null,
    source:{documentId:`invented-document-${recordId}`,pageNumber:1,associationLocation:`invented-line-${recordId}`,sourceSha256:'invented-source-identity-not-a-real-hash',evidenceDigest:'invented-evidence-identity-not-a-real-hash',attemptId:'invented-attempt'},
    review:{decision:'APPROVE',pageDecision:'APPROVE',associationConfirmed:true,revisionVersion:'invented-v1',reviewHash:'invented-review-identity-not-a-real-hash'},...overrides};
}
const records = [
  inventedRecord('zero'),
  inventedRecord('limited',{collectionDate:'2040-02-01',valueRaw:'<5',valueNumeric:5,resultType:'comparator',comparator:'<'}),
  inventedRecord('qualitative',{collectionDate:'2040-03-01',valueRaw:'Não detectado',valueNumeric:null,resultType:'qualitative'}),
  inventedRecord('missing',{collectionDate:'2040-04-01',valueRaw:null,valueNumeric:null,resultType:'missing'}),
  inventedRecord('without-unit',{unit:null}),
  inventedRecord('different-unit',{unit:'outra-u-demo',valueRaw:'7',valueNumeric:7}),
  inventedRecord('different-code',{biomarkerCode:'DEMO-B',valueRaw:'11',valueNumeric:11}),
  inventedRecord('same-date-other-source',{valueRaw:'2',valueNumeric:2}),
  inventedRecord('unknown-date',{collectionDate:null,valueRaw:'3',valueNumeric:3}),
  inventedRecord('pending',{review:{decision:'PENDING'}}),
  inventedRecord('rejected',{review:{decision:'REJECT'}}),
  inventedRecord('page-rejected',{review:{decision:'APPROVE',pageDecision:'REJECT'}}),
  inventedRecord('association-pending',{review:{decision:'APPROVE',pageDecision:'APPROVE',associationConfirmed:false}}),
  inventedRecord('corrected',{snapshotId:'invented-corrected-old',valueRaw:'99',valueNumeric:99}),
  inventedRecord('corrected',{snapshotId:'invented-corrected-current',collectionDate:'2040-05-01',valueRaw:'4.00',valueNumeric:4,review:{decision:'APPROVE',pageDecision:'APPROVE',associationConfirmed:true,revisionVersion:'invented-v2',reviewHash:'invented-review-v2'}}),
  inventedRecord('no-code',{biomarkerCode:null})
];
export const demo = {profile:'synthetic_demo',records,selectedSnapshots:records.filter(r=>r.snapshotId!=='invented-corrected-old').map(({recordId,snapshotId})=>({recordId,snapshotId}))};
